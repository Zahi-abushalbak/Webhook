"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker = void 0;
const bullmq_1 = require("bullmq");
const db_1 = require("./db");
const queue_1 = require("./queue");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
exports.worker = new bullmq_1.Worker('webhook-jobs', async (bullJob) => {
    const { jobId, pipelineId, payload } = bullJob.data;
    await db_1.prisma.job.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' }
    });
    const pipeline = await db_1.prisma.pipeline.findUnique({
        where: { id: pipelineId },
        include: {
            actions: { orderBy: { order: 'asc' } },
            subscribers: true
        }
    });
    if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
    }
    let currentPayload = { ...payload };
    for (const action of pipeline.actions) {
        try {
            if (action.type === 'TRANSFORM') {
                // config example: { "map": { "newKey": "oldKey" } }
                const config = action.config;
                if (config?.map) {
                    const transformed = {};
                    for (const [newKey, oldKey] of Object.entries(config.map)) {
                        transformed[newKey] = currentPayload[oldKey];
                    }
                    currentPayload = transformed;
                }
            }
            else if (action.type === 'FILTER') {
                // config example: { "field": "amount", "operator": ">", "value": 100 }
                const config = action.config;
                const fieldValue = currentPayload[config.field];
                let passed = false;
                switch (config.operator) {
                    case '>':
                        passed = Number(fieldValue) > Number(config.value);
                        break;
                    case '<':
                        passed = Number(fieldValue) < Number(config.value);
                        break;
                    case '===':
                        passed = fieldValue === config.value;
                        break;
                    case '!==':
                        passed = fieldValue !== config.value;
                        break;
                    default: passed = true;
                }
                if (!passed) {
                    // Filter failed, stop processing
                    await db_1.prisma.job.update({
                        where: { id: jobId },
                        data: {
                            status: 'FILTERED',
                            processedPayload: currentPayload
                        }
                    });
                    return; // Job intentionally ends here, gracefully
                }
            }
            else if (action.type === 'ENRICH') {
                // config example: { "appendTimestamp": true, "staticData": { "source": "system-x" } }
                const config = action.config;
                if (config?.appendTimestamp) {
                    currentPayload._processedAt = new Date().toISOString();
                }
                if (config?.staticData) {
                    currentPayload = { ...currentPayload, ...config.staticData };
                }
            }
        }
        catch (err) {
            throw new Error(`Action ${action.type} failed: ${err.message}`);
        }
    }
    await db_1.prisma.job.update({
        where: { id: jobId },
        data: {
            status: 'COMPLETED',
            processedPayload: currentPayload
        }
    });
    // Enqueue delivery jobs to subscribers
    for (const subscriber of pipeline.subscribers) {
        await queue_1.deliveryQueue.add('deliver-webhook', {
            jobId,
            subscriberId: subscriber.id,
            url: subscriber.url,
            payload: currentPayload
        });
    }
}, { connection });
exports.worker.on('completed', (job) => {
    console.log(`Webhook Job ${job.id} has completed successfully.`);
});
exports.worker.on('failed', async (job, err) => {
    console.error(`Webhook Job ${job?.id} failed:`, err);
    if (job?.data?.jobId) {
        await db_1.prisma.job.update({
            where: { id: job.data.jobId },
            data: { status: 'FAILED' }
        }).catch(console.error);
    }
});
console.log('Webhook Processor Worker started');
