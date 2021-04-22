import md5 from 'md5'
import NodeCache from 'node-cache'
import { v4 as uuidv4 } from 'uuid'
import { Push, Subscriber } from 'zeromq'
import { DEBUG_CACHE_EVENTS, LOG_PARAMS, LOG_REQUESTS } from '../config/log'
import { whitelist } from '../config/whitelist'

const cache = new NodeCache({ stdTTL: 5, checkperiod: 10 })

export interface JSONRpcResponse {
    id?: number | string
    jsonrpc: '2.0'
    result: any
}

export interface ServerConfig {
    workQueueAddress: string
    resultQueueAddress: string
}

export class Collector {

    workMap: { [id: string]: (result: JSONRpcResponse) => any } = {}
    totalRequests = 0
    workQueue = new Push
    resultQueue = new Subscriber

    constructor(private config: ServerConfig) {
        this.init()
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
            const { id, result, name: worker } = JSON.parse(msg.toString())
            console.log(`received result for work id ${id} from worker ${worker}`)
            if (this.workMap[id]) {
                this.workMap[id](result)
            } else {
                console.error(`id ${id} not found in workmap`)
                process.exit(1)
            }
        }
    }

    async call(method: string, params: any[] = [], id = uuidv4()) {
        const nonce = ++this.totalRequests
        if (LOG_REQUESTS) {
            this.logRequest(method, params, nonce)
        }
        if (whitelist.indexOf(method) === -1) {
            throw Error('Access denied')
        }
        switch (method) {
            case 'rpc_methods':
                return { methods: whitelist, version: 1 }
            case 'eth_blockNumber':
            case 'eth_chainId':
                const cacheKey = md5(method).toString()
                let result = cache.get(cacheKey)
                if (result) {
                    if(DEBUG_CACHE_EVENTS){
                        console.debug(`get result from cache for ${method} value: ${result}`)
                    }
                    return result
                }
                result = await this.provideWork(method, params, id)
                if (result) {
                    if(DEBUG_CACHE_EVENTS){
                        console.debug(`store ${result} cache for ${method}`)
                    }
                    cache.set(cacheKey, result)
                }
                return result
            default:
                return await this.provideWork(method, params, id)
        }
    }

    private logRequest(method: string, params: any = [], nonce: number) {
        if (LOG_PARAMS) {
            console.log(`#${nonce} request ${method} with params ${JSON.stringify(params)}`)
        } else {
            console.log(`#${nonce} request ${method}`)
        }
    }

    private provideWork(method: string, params: any[] = [], id = uuidv4()): Promise<JSONRpcResponse> {
        return new Promise(async (resolve) => {
            this.workMap[id] = (result: JSONRpcResponse) => resolve(result)
            await this.workQueue.send(JSON.stringify({ method, params, id }))
        })
    }
}