export const CACHE_ENABLE = process.env.CACHE_ENABLE ? process.env.CACHE_ENABLE === 'true' : true

export const DEFAULT_CACHE_METHODS = [
    "eth_blockNumber",
    "eth_chainId",
    "eth_gasPrice",
    "net_listening",
    "net_version",
    "web3_clientVersion",
]
export const CACHE_METHODS = process.env.CACHE_METHODS ? process.env.CACHE_METHODS.split(',') : DEFAULT_CACHE_METHODS