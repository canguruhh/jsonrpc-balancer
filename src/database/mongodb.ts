import { Schema, connect, model, Mongoose } from 'mongoose'

export const LogSchema = new Schema({
    id: {
        type: String,
    },
    transactionHash: {
        type: String,
        index: true,
    },
    transactionIndex: Number,
    logIndex: Number,
    address: String,
    blockNumber: Number,
    blockHash: String,
    data: String,
    removed: Boolean,
    topics: [String],
}, {
    collection: 'log',
}).index({
    transactionHash: 1,
    logIndex: 1,
}, { unique: true })

export const LogModel = model('Log', LogSchema)

export interface GetLogsParams {
    address?: string
    fromBlock?: number | 'latest' | 'earliest' | 'pending'
    toBlock?: number | 'latest' | 'earliest' | 'pending'
    topics?: string
    blockhash?: string
}

export class MongoDB {

    db: Promise<Mongoose>

    constructor(url: string) {
        this.db = connect(url, {
            useCreateIndex: false,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        console.info('connected to mongodb')
    }

    async disconnect() {
        if (this.db) {
            const db = await this.db
            db.disconnect()
        }
    }

    async getLogs(params: GetLogsParams) {

        if (params.blockhash && params.fromBlock) {
            throw Error('blockhash is not allowed to be specified along fromBlock')
        }

        if (params.blockhash && params.toBlock) {
            throw Error('blockhash is not allowed to be specified along toBlock')
        }

        switch (params.toBlock) {
            case 'pending':
                throw Error('pending toBlock currently not supported')
            case 'earliest':
                params.toBlock = 0
                break
            case 'latest':
                params.toBlock = undefined
                break
            case undefined:
                break
            default:
                params.toBlock = Number(params.toBlock)
        }

        switch (params.fromBlock) {
            case 'pending':
                throw Error('pending fromBlock currently not supported')
            case 'latest':
                throw Error('latest fromBlock currently not supported')
            case 'earliest':
                params.fromBlock = 0
                break
            case undefined:
                break
            default:
                params.fromBlock = Number(params.fromBlock)
        }

        const logs = await LogModel.find({
            ...(params.address && { address: params.address }),
            ...((params.toBlock || params.fromBlock) && {
                blockNumber: {
                    ...(params.toBlock && { $lte: params.toBlock }),
                    ...(params.fromBlock && { $gte: params.fromBlock }),
                }
            }),
            ...(params.topics && { topics: params.topics }),
            ...(params.blockhash && { blockHash: params.blockhash }),
        }, { _id: 0 }, { limit: 500, sort: { blockNumber: 1, transactionIndex: 1 } })

        return logs.map(log => ({
            ...log.toObject(),
            transactionIndex: '0x' + Number(log.get('transactionIndex')).toString(16),
            blockNumber: '0x' + Number(log.get('blockNumber')).toString(16),
        }))
    }
}


