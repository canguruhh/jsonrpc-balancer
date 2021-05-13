import md5 from 'md5'
import NodeCache from 'node-cache'
import { v4 as uuidv4 } from 'uuid'
import { Push, Subscriber } from 'zeromq'
import { CACHE_ENABLE, CACHE_METHODS } from '../config/cache'
import { DEBUG_CACHE_EVENTS, LOG_PARAMS, LOG_REQUESTS } from '../config/log'
import { METHOD_WHITELIST } from '../config/whitelist'
import { Metrics } from '../monitoring/metrics'
import { BigNumber } from 'bignumber.js'
import { ESTIMATE_GAS_LIMIT } from '../config/rpc'
import { MongoDB } from '../database/mongodb'

const cache = new NodeCache({ stdTTL: 5, checkperiod: 10 })

export interface JSONRpcResponse {
    id?: number | string
    jsonrpc: '2.0'
    result: any
}

export interface ServerConfig {
    workQueueAddress: string
    resultQueueAddress: string
    metrics: Metrics
    database?: MongoDB
}

export class Collector {

    workMap: { [id: string]: (error: string | null | undefined, result: JSONRpcResponse) => any } = {}
    totalRequests = 0
    workQueue = new Push
    resultQueue = new Subscriber

    metrics: Metrics

    responseCounter = {
        success: 0,
        error: 0,
    }

    constructor(private config: ServerConfig) {
        this.metrics = config.metrics
        this.init()
        if(ESTIMATE_GAS_LIMIT){
            console.info(`found ESTIMATE_GAS_LIMIT env. gas limit estimation will be capped at ${ESTIMATE_GAS_LIMIT}`)
        }
    }

    async init() {
        await this.workQueue.bind(this.config.workQueueAddress).then(() => {
            console.log(`Work queue bound to ${this.config.workQueueAddress}`)
        })
        await this.resultQueue.bind(this.config.resultQueueAddress).then(() => {
            console.log(`Result queue bound to ${this.config.resultQueueAddress}`)
        })
        this.resultQueue.subscribe('result')
        console.log('start to wait for results')
        for await (const [_topic, msg] of this.resultQueue) {
            const { id, error, result, name: worker, method } = JSON.parse(msg.toString())
            this.metrics.incRpcWorkerResponseCounter(worker)
            console.log(`received result for ${method} id ${id} from worker ${worker}`)
            if (this.workMap[id]) {
                this.workMap[id](error, result)
                delete this.workMap[id]
            } else {
                console.error(`id ${id} not found in workmap`)
                process.exit(1)
            }
        }
    }

    async call(method: string, params: any[] = [], id = uuidv4()) {
        const nonce = ++this.totalRequests
        if (LOG_REQUESTS) {
            this.logRequest(method, params, nonce, id)
        }
        if (METHOD_WHITELIST.indexOf(method) === -1) {
            this.metrics.incRpcMethodResponseCounter(method, 'access_denied')
            throw Error('Access denied')
        }
        if (CACHE_ENABLE) {
            if (method === 'rpc_methods') {
                return { methods: METHOD_WHITELIST, version: 1 }
            }
            if (CACHE_METHODS.indexOf(method) !== -1) {
                const cacheKey = md5(method).toString()
                let result = cache.get(cacheKey)
                if (result) {
                    if (DEBUG_CACHE_EVENTS) {
                        console.debug(`get result from cache for ${method} value: ${result}`)
                    }
                    this.metrics.incRpcMethodResponseCounter(method, 'cached')
                    return result
                }
                result = await this.provideWork(method, params, id)
                if (result) {
                    if (DEBUG_CACHE_EVENTS) {
                        console.debug(`store ${result} cache for ${method}`)
                    }
                    cache.set(cacheKey, result)
                }
                this.metrics.incRpcMethodResponseCounter(method, 'success')
                return result
            }
        }
        if(this.config.database !== undefined){
            if(method==='eth_getLogs'){
                const logs = await this.config.database.getLogs(params[0])
                this.metrics.incRpcMethodResponseCounter(method, 'db_lookup')
                return logs
            }
        }
        try {
            let result: any = await this.provideWork(method, params, id)
            if (method === 'eth_estimateGas' && ESTIMATE_GAS_LIMIT && new BigNumber(result).gt(new BigNumber(ESTIMATE_GAS_LIMIT))) {
                result = '0x' + new BigNumber(new BigNumber(ESTIMATE_GAS_LIMIT)).toString(16)
            }
            this.metrics.incRpcMethodResponseCounter(method, 'success')
            return result
        } catch (error) {
            console.error(`error on request #${nonce}`, error.message)
            this.metrics.incRpcMethodResponseCounter(method, this.getErrorType(error.message))
            throw Error(error.message)
        }
    }

    private logRequest(method: string, params: any = [], nonce: number, id?: any) {
        if (LOG_PARAMS) {
            console.log(`#${nonce} ${id} request ${method} with params ${JSON.stringify(params)}`)
        } else {
            console.log(`#${nonce} ${id} request ${method}`)
        }
    }

    private provideWork(method: string, params: any[] = [], id = uuidv4()): Promise<JSONRpcResponse> {
        return new Promise(async (resolve, reject) => {

            this.metrics.incRpcQueueDepth()
            this.workMap[id] = (error: string, result: JSONRpcResponse) => {
                this.metrics.decRpcQueueDepth()
                if (error) {
                    return reject(Error(error))
                }
                return resolve(result)
            }
            await this.workQueue.send(JSON.stringify({ method, params, id }))
        })
    }

    private getErrorType(message: string) {
        switch (message) {
            case 'evm error: OutOfGas':
                return 'evm_out_of_gas'
            default:
                if (message.indexOf('call runtime failed: UnknownBlock("Require header: BlockId::Number') !== -1) {
                    return 'unknown_block'
                }
                console.error(`unregistered rpc response error: "${message}"`)
                return 'other_error'
        }
    }

}