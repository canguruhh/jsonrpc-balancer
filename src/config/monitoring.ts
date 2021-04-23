export const MONITORING_PORT = parseInt(process.env.PORT, 10) || 9615
export const MONITORING_BIND_ADDRESS = process.env.MONITORING_BIND_ADDRESS || '127.0.0.1'

export const MONITORING_NODE_NAME = process.env.MONITORING_NODE_NAME
export const MONITORING_ACCESS_TOKEN = process.env.MONITORING_ACCESS_TOKEN