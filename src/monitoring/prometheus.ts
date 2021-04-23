import {Registry, Counter, Gauge,} from 'prom-client'
import { MONITORING_NODE_NAME } from '../config/monitoring'

export class Metrics {
    
    register = new Registry()

    httpRpcRequestCounter = new Counter({
        name: 'http_rpc_request_count',
        help: 'total number of http rpc requests',
    })

    rpcMethodResponseCounter = new Counter({
        name: 'rpc_method_response_status',
        help: 'rpc response status. does not need to be a failed request. can also be an rpc request that returned an error message (evm_out_of_gas, ...).',
        labelNames: ['method', 'status',],
    })

    rpcQueueDepth = new Gauge({
        name: 'rpc_queue_depth',
        help: 'number of pending rpc requests in queue',
    })
    
    constructor(){
        if(MONITORING_NODE_NAME){
            this.register.setDefaultLabels({
                name: MONITORING_NODE_NAME
            })
        }
        this.register.registerMetric(this.httpRpcRequestCounter)
        this.register.registerMetric(this.rpcMethodResponseCounter)
        this.register.registerMetric(this.rpcQueueDepth)
    }

} 
