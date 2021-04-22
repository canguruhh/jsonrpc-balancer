import { RpcWebSocketClient } from 'rpc-websocket-client'
import { Pull, Publisher } from 'zeromq'

export interface WSWorkerConfig {
    url: string
    name: string
    workQueueAddress: string
    resultQueueAddress: string
}

export class WSWorker {

    rpc = new RpcWebSocketClient()
    workQueue = new Pull
    resultQueue = new Publisher

    constructor(private config: WSWorkerConfig) {
        this.init()
    }

    private async reconnect() {
        try {
            await this.rpc.connect(this.config.url)
            console.log(`websocket host ${this.config.url} reconnected`)
            return true
        } catch (error) {
            console.log(`worker ${this.config.name} could not reconnect`)
            return false
        }
    }

    private async init() {
        await this.rpc.connect(this.config.url)
        this.rpc.onClose(async () => {
            await delay(1000)
            await this.reconnect()
        })
        console.log(`websocket host ${this.config.url} connected`)
        this.workQueue.connect(this.config.workQueueAddress)
        this.resultQueue.connect(this.config.resultQueueAddress)
        for await (const [msg] of this.workQueue) {
            const { id, method, params } = JSON.parse(msg.toString())
            const result: Object = await this.rpc.call(method, params)
            await this.resultQueue.send(['result', JSON.stringify({ result, id, name: this.config.name })])
        }
    }

}

function delay(millis: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, millis)
    })
}