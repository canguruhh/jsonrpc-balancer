export function isWebsocketURL(wsUrl: string) {
    try {
        const url = new URL(wsUrl)
        switch (url.protocol) {
            case 'ws:':
            case 'wss:':
                return true
            default:
                return false
        }
    } catch (error) {
        return false
    }
}