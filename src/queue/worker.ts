import {Client} from 'jsonrpc2-ws'
import { Pull, Publisher } from 'zeromq'
import { v4 as uuidv4 } from 'uuid'
export interface WSWorkerConfig {
    url: string
    name: string
    workQueueAddress: string
    resultQueueAddress: string
}

export class WSWorker {

    rpc = new Client(this.config.url, {autoConnect: true});
    workQueue = new Pull
    resultQueue = new Publisher

    constructor(private config: WSWorkerConfig) {
        this.init()
    }

    private async reconnect() {
        try {
            await this.rpc.connect()
            console.log(`websocket host ${this.config.url} reconnected`)
            return true
        } catch (error) {
            console.log(`worker ${this.config.name} could not reconnect`)
            return false
        }
    }

    private async init() {
        await this.rpc.connect()
        console.log(`websocket host ${this.config.url} connected`)
        this.workQueue.connect(this.config.workQueueAddress)
        this.resultQueue.connect(this.config.resultQueueAddress)
        for await (const [msg] of this.workQueue) {
            const { id, method, params } = JSON.parse(msg.toString())
            try{
                const result = await this.rpc.call(method, params)
                await this.resultQueue.send(['result', JSON.stringify({ result, id, name: this.config.name, method })])
            } catch (error){
                await this.resultQueue.send(['result', JSON.stringify({ error: error.message, id, name: this.config.name, method })])
            }
        }
    }

}