import express, { Express, Request, Response } from 'express'
import { json } from 'body-parser'
import cors from 'cors'
import { Collector } from '../queue/collector'
import { WSWorker } from '../queue/worker'
import { Metrics } from '../monitoring/metrics'
import { HTTP_RPC_ALLOW_BATCH } from '../config/rpc'
import { CORS_ENABLE } from '../config/network'
export interface HttpServerConfig {
    collector: Collector
    port: number
    bind_address: string
    workers: WSWorker[]
    metrics: Metrics
}

export class HttpRPCEndpoint {

    app: Express

    constructor(private config: HttpServerConfig) {
        this.app = express()
            .use(json())
        if(CORS_ENABLE){
            this.app
                .use(cors())
        }
        this.initRoutes()
    }

    initRoutes() {
        this.app.post('*', (req, res) => this._handleRpcRequest(req, res))
    }

    listen() {
        return this.app.listen(this.config.port, this.config.bind_address, () => {
            console.log(`rpc server bound to ${this.config.bind_address}:${this.config.port}`)
        })
    }

    private async _handleRpcRequest(req: Request, res: Response) {
        this.config.metrics.incHttpRequestCounter()
        const isBatch = Array.isArray(req.body)
        const jobs = isBatch ? req.body : [req.body]
        
        const results = []
        for (const { method, params, id } of jobs) {
            if(isBatch && !HTTP_RPC_ALLOW_BATCH){
                this.config.metrics.incRpcMethodResponseCounter(method, 'batch_blocked')
                results.push({ jsonrpc: '2.0', error: { message: 'batch call disabled' }, id})
            } else {
                try {
                    const result = await this.config.collector.call(method, params)
                    results.push({ jsonrpc: '2.0', id, result })
                } catch (error) {
                    results.push({ jsonrpc: '2.0', error: { message: error.message }, id })
                }
            }
        }
        res.json(isBatch ? results : results[0])
    }

}