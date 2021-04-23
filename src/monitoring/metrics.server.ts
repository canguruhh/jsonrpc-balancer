import express, { Express, Request, Response } from 'express'
import { json } from 'body-parser'
import cors from 'cors'
import { Metrics } from './metrics'
import { MONITORING_ACCESS_TOKEN } from '../config/monitoring'

export interface MetricsServerConfig {
    port: number
    bind_address: string
    metrics: Metrics
}

export class MetricsServer {

    app: Express

    constructor(private config: MetricsServerConfig) {
        this.app = express()
            .use(json())
            .use(cors())
        this.initRoutes()
    }

    initRoutes() {
        this.app.get('/metrics', (req, res) => this._handleMetricsRequests(req, res))
    }

    listen() {
        return this.app.listen(this.config.port, this.config.bind_address, () => {
            console.log(`metrics will be provided on http://${this.config.bind_address}:${this.config.port}/metrics`)
        })
    }

    private async _handleMetricsRequests(_req: Request, res: Response) {
        if(MONITORING_ACCESS_TOKEN && _req.header('x-access-token')!==MONITORING_ACCESS_TOKEN){
            res.status(403).send('access denied')
        } else {
            res.send(await this.config.metrics.register.metrics())
        }
    }

}