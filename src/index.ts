import { WSWorker } from './queue/worker'
import { Collector } from './queue/collector'
import { HTTP_BIND_ADDRESS, HTTP_PORT, WS_ENDPOINTS, ZMQ_RESULT_QUEUE_ADDRESS, ZMQ_WORK_QUEUE_ADDRESS } from './config/network'
import { HttpRPCEndpoint } from './endpoints/http.endpoint'
import { isWebsocketURL } from './helper/url.helper'
import { Metrics } from './monitoring/metrics'
import { MetricsServer } from './monitoring/metrics.server'
import { MONITORING_BIND_ADDRESS, MONITORING_PORT } from './config/monitoring'
import { WSEndpoint } from './interfaces'
const metrics = new Metrics()

// Setup collector queue to delegate jsonrpc requests to workers
const collector = new Collector({
    resultQueueAddress: ZMQ_RESULT_QUEUE_ADDRESS,
    workQueueAddress: ZMQ_WORK_QUEUE_ADDRESS,
    metrics,
})

// Initialize one worker for every provided ws upstream
const workers = WS_ENDPOINTS.map((wsEndpoint: WSEndpoint) => {
    console.log(`connect to endpoint ${wsEndpoint.name} url: ${wsEndpoint.url}`)
    if (!isWebsocketURL(wsEndpoint.url)) {
        console.error(`invalid ws endpoint: ${wsEndpoint}`)
        process.exit(1)
    }
    return new WSWorker({
        url: wsEndpoint.url,
        resultQueueAddress: ZMQ_RESULT_QUEUE_ADDRESS,
        workQueueAddress: ZMQ_WORK_QUEUE_ADDRESS,
        name: wsEndpoint.name,
    })
})

// Start http server
new HttpRPCEndpoint({
    collector,
    port: HTTP_PORT,
    bind_address: HTTP_BIND_ADDRESS,
    workers,
    metrics,
}).listen()

new MetricsServer({
    port: MONITORING_PORT,
    bind_address: MONITORING_BIND_ADDRESS,
    metrics,
}).listen()

