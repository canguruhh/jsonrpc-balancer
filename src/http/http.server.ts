import express, { Express } from 'express'
import { json } from 'body-parser'
import cors from 'cors'
import { Collector } from '../queue/collector'
import { WSWorker } from '../queue/worker'
import { LOG_PARAMS } from '../config/log'


export interface HttpServerConfig {
    collector: Collector
    port: number
    bind_address: string
    workers: WSWorker[]
}

export class HttpServer {

    counter = 0
    app: Express

    constructor(private config: HttpServerConfig) {
        this.app = express()
            .use(json())
            .use(cors())
        this.app.post('*', async (req, res) => {
            const isMulticall = Array.isArray(req.body)
            const jobs = isMulticall ? req.body : [req.body]

            const results = []

            for (const { method, params, id } of jobs) {
                const nonce = ++this.counter
                
                try {
                    const result = await this.config.collector.call(method, params, nonce)
                    results.push({ jsonrpc: '2.0', id, result })
                } catch (error) {
                    console.error(`error on request #${nonce}`, error)
                    results.push({ jsonrpc: '2.0', error: { message: error.message }, id })
                }
            }
            res.json(isMulticall ? results : results[0])
        })
        this.app.get('/workers', (_req, res) => {
            res.json(this.config.workers.length)
        })
    }

    

    listen() {
        return this.app.listen(this.config.port, this.config.bind_address, () => {
            console.log(`rpc server bound to ${this.config.bind_address}:${this.config.port}`)
        })
    }

}