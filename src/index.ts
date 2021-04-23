import { WSWorker } from './queue/worker'
import { Collector } from './queue/collector'
import { HTTP_BIND_ADDRESS, HTTP_PORT, WS_ENDPOINTS, ZMQ_RESULT_QUEUE_ADDRESS, ZMQ_WORK_QUEUE_ADDRESS } from './config/network'
import { HttpServer } from './http/http.server'
import { isWebsocketURL } from './helper/url.helper'
import { Metrics } from './monitoring/prometheus'
const metrics = new Metrics()

// Setup collector queue to delegate jsonrpc requests to workers
const collector = new Collector({
    resultQueueAddress: ZMQ_RESULT_QUEUE_ADDRESS,
    workQueueAddress: ZMQ_WORK_QUEUE_ADDRESS,
    metrics,
})

// Initialize one worker for every provided ws upstream
const workers = WS_ENDPOINTS.map((wsUrl: string) => {
    if (!isWebsocketURL(wsUrl)) {
        console.error(`invalid ws endpoint: ${wsUrl}`)
        process.exit(1)
    }
    return new WSWorker({
        url: wsUrl,
        resultQueueAddress: ZMQ_RESULT_QUEUE_ADDRESS,
        workQueueAddress: ZMQ_WORK_QUEUE_ADDRESS,
        name: wsUrl,
    })
})


// Start http server
new HttpServer({
    collector,
    port: HTTP_PORT,
    bind_address: HTTP_BIND_ADDRESS,
    workers,
    metrics,
}).listen()

