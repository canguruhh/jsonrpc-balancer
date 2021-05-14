import { Schema, connect, model, Mongoose } from 'mongoose'
import { flattenDeep } from 'lodash'
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

export const BlockSchema = new Schema({
    number: {
        type: Number,
        index: true,
    },
    hash: {
        type: String,
        unique: true,
    },
    size: Number,
    transactions: [String],
    parentHash: String,
    timestamp: Number,
    gasUsed: Number,
    miner: String,
}, {
    collection: 'block',
})

export const BlockModel = model('Block', BlockSchema)
export const LogModel = model('Log', LogSchema)

export interface GetLogsParams {
    address?: string
    fromBlock?: number | 'latest' | 'earliest' | 'pending'
    toBlock?: number | 'latest' | 'earliest' | 'pending'
    topics?: string | string[] | string[][]
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

    async getHeight() {
        const latestBlock = await BlockModel.findOne({}, { number: 1 }, { sort: { number: -1 }, limit: 1, })
        return latestBlock ? latestBlock.get('number') : 0
    }

    async getLogs(params: GetLogsParams = {}) {

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

        params.topics = Array.isArray(params.topics) ? flattenDeep(params.topics) : [params.topics]

        switch (params.fromBlock) {
            case 'pending':
                throw Error('pending fromBlock currently not supported')
            case 'latest':
                params.fromBlock = await this.getHeight()
                break
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
            ...(params.topics && { topics: { $in: params.topics } }),
            ...(params.blockhash && { blockHash: params.blockhash }),
        }, { _id: 0 }, { limit: 1001, sort: { blockNumber: 1, transactionIndex: 1 }, collation: { locale: 'en', strength: 2 }, })

        if (logs.length > 1000) {
            throw Error('limit of 1000 results exceeded')
        }

        return logs.map(log => ({
            ...log.toObject(),
            logIndex: '0x' + Number(log.get('logIndex')).toString(16),
            transactionIndex: '0x' + Number(log.get('transactionIndex')).toString(16),
            blockNumber: '0x' + Number(log.get('blockNumber')).toString(16),
        }))
    }
}


