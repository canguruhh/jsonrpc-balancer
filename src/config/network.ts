export const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 8000
export const HTTP_BIND_ADDRESS = process.env.HTTP_BIND_ADDRESS || '0.0.0.0'

export const ZMQ_WORK_QUEUE_ADDRESS = process.env.ZMQ_WORK_QUEUE_ADDRESS || 'tcp://127.0.0.1:3010'
export const ZMQ_RESULT_QUEUE_ADDRESS = process.env.ZMQ_RESULT_QUEUE_ADDRESS || 'tcp://127.0.0.1:3020'

export const WS_ENDPOINTS = process.env.WS_ENDPOINTS ? process.env.WS_ENDPOINTS.split(',') : []