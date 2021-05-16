export const HTTP_RPC_ALLOW_BATCH = process.env.HTTP_RPC_ALLOW_BATCH === 'true'

export const ESTIMATE_GAS_LIMIT = process.env.ESTIMATE_GAS_LIMIT ? process.env.ESTIMATE_GAS_LIMIT : null
export const ESTIMATE_GAS_IGNORE_GASPRICE_PARAM = process.env.ESTIMATE_GAS_IGNORE_GASPRICE_PARAM !== 'false'

// enable rpc slow down rate
export const HTTP_RPC_SLOW_DOWN_ENABLE = process.env.HTTP_RPC_SLOW_DOWN_ENABLE === 'true'
// time window of unrestricted requests
export const HTTP_RPC_SLOW_DOWN_WINDOW_MS = process.env.HTTP_RPC_SLOW_DOWN_WINDOW_MS ? Number(process.env.HTTP_RPC_SLOW_DOWN_WINDOW_MS) : 60 * 1000
// number of allowed fast requests in time window
export const HTTP_RPC_SLOW_DOWN_DELAY_AFTER = process.env.HTTP_RPC_SLOW_DOWN_DELAY_AFTER ? Number(process.env.HTTP_RPC_SLOW_DOWN_DELAY_AFTER) : 10
// increasing delay for every future request in the time window after the limit was reached
export const HTTP_RPC_SLOW_DOWN_DELAY_MS = process.env.HTTP_RPC_SLOW_DOWN_DELAY_MS ? Number(process.env.HTTP_RPC_SLOW_DOWN_DELAY_MS) : 500
// maximum delay for each request
export const HTTP_RPC_SLOW_DOWN_MAX_DELAY_MS = process.env.HTTP_RPC_SLOW_DOWN_MAX_DELAY_MS ? Number(process.env.HTTP_RPC_SLOW_DOWN_MAX_DELAY_MS) : 10 * 1000