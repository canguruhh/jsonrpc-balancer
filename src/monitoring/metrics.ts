import {Registry, Counter, Gauge,} from 'prom-client'
import { MONITORING_NODE_NAME } from '../config/monitoring'

export class Metrics {
    
    register = new Registry()

    private httpRpcRequestCounter = new Counter({
        name: 'balancer_http_rpc_request_count',
        help: 'total number of http rpc requests',
    })

    private rpcMethodResponseCounter = new Counter({
        name: 'balancer_rpc_method_response_status',
        help: 'rpc response status. does not need to be a failed request. can also be an rpc request that returned an error message (evm_out_of_gas, ...).',
        labelNames: ['method', 'status',],
    })

    private rpcQueueDepth = new Gauge({
        name: 'balancer_rpc_queue_depth',
        help: 'number of pending rpc requests in queue',
    })

    private rpcWorkerResponseCounter = new Gauge({
        name: 'balancer_rpc_queue_worker_respose_counter',
        help: 'number of responses provided by a rpc queue worker',
        labelNames: ['worker_name'],
    })
    
    constructor(){
        if(MONITORING_NODE_NAME){
            this.register.setDefaultLabels({
                name: MONITORING_NODE_NAME
            })
        }
        this.register.registerMetric(this.httpRpcRequestCounter)
        this.register.registerMetric(this.rpcWorkerResponseCounter)
        this.register.registerMetric(this.rpcMethodResponseCounter)
        this.register.registerMetric(this.rpcQueueDepth)
    }

    incRpcWorkerResponseCounter(workerName: string){
        this.rpcWorkerResponseCounter.labels(workerName).inc()
    }

    incHttpRequestCounter(){
        this.httpRpcRequestCounter.inc()
    }

    incRpcMethodResponseCounter(method: string, status: string){
        this.rpcMethodResponseCounter.labels(method, status).inc()
    }

    incRpcQueueDepth(){
        this.rpcQueueDepth.inc()
    }

    decRpcQueueDepth(){
        this.rpcQueueDepth.dec()
    }

} 
