import express, { Express, Request, Response } from 'express'
import { json } from 'body-parser'
import cors from 'cors'
import { Collector } from '../queue/collector'
import { WSWorker } from '../queue/worker'


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
        this.initRoutes()
    }

    initRoutes() {
        this.app.post('*', (req, res) => this._handleRpcRequest(req, res))
        this.app.get('/workers', (req, res) => this._handleCountWorkers(req, res))
    }

    listen() {
        return this.app.listen(this.config.port, this.config.bind_address, () => {
            console.log(`rpc server bound to ${this.config.bind_address}:${this.config.port}`)
        })
    }

    private async _handleRpcRequest(req: Request, res: Response) {
        const isMulticall = Array.isArray(req.body)
        const jobs = isMulticall ? req.body : [req.body]

        const results = []

        for (const { method, params, id } of jobs) {
            const nonce = this.counter
            try {
                const result = await this.config.collector.call(method, params)
                results.push({ jsonrpc: '2.0', id, result })
            } catch (error) {
                console.error(`error on request #${nonce}`, error.message)
                results.push({ jsonrpc: '2.0', error: { message: error.message }, id })
            }
        }
        res.json(isMulticall ? results : results[0])
    }

    private async _handleCountWorkers(_req: Request, res: Response) {
        res.json(this.config.workers.length)
    }

}