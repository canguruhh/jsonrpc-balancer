import express, { Express, Request, Response } from 'express'
import { json } from 'body-parser'
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
            .set('trust proxy', true)
        
        this.initRoutes()
    }

    initRoutes() {
        this.app.get('/metrics', (req, res) => this._handleMetricsRequests(req, res))
    }

    listen() {
        return this.app.listen(this.config.port, this.config.bind_address, () => {
            console.log(`metrics will be provided on ${this.config.bind_address}:${this.config.port}`)
        })
    }

    private async _handleMetricsRequests(req: Request, res: Response) {
        if(MONITORING_ACCESS_TOKEN && (req.header('x-access-token')!==MONITORING_ACCESS_TOKEN && req.query['x-access-token']!==MONITORING_ACCESS_TOKEN)){
            console.log(`metrics access denied for ${req.ip}`)
            res.status(403)
                .send('access denied')
        } else {
            console.log(`metrics accessed from ${req.ip}`)
            res.contentType(this.config.metrics.register.contentType)
                .send(await this.config.metrics.register.metrics())
        }
    }

}