export const HTTP_RPC_ALLOW_BATCH = process.env.HTTP_RPC_ALLOW_BATCH === 'true'

export const ESTIMATE_GAS_LIMIT = process.env.ESTIMATE_GAS_LIMIT ? process.env.ESTIMATE_GAS_LIMIT : null
export const ESTIMATE_GAS_IGNORE_GASPRICE_PARAM = process.env.ESTIMATE_GAS_IGNORE_GASPRICE_PARAM !== 'false'