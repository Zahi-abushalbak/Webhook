"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryWorker = void 0;
const bullmq_1 = require("bullmq");
const db_1 = require("./db");
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
exports.deliveryWorker = new bullmq_1.Worker('delivery-jobs', async (bullJob) => {
    const { jobId, subscriberId, url, payload } = bullJob.data;
    let deliveryAttempt = await db_1.prisma.deliveryAttempt.create({
        data: {
            jobId,
            subscriberId,
            status: 'PENDING'
        }
    });
    try {
        const response = await axios_1.default.post(url, payload, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
        });
        await db_1.prisma.deliveryAttempt.update({
            where: { id: deliveryAttempt.id },
            data: {
                status: 'SUCCESS',
                responseCode: response.status,
                responseBody: JSON.stringify(response.data).substring(0, 1000)
            }
        });
        console.log(`Successfully delivered job ${jobId} to ${url}`);
    }
    catch (error) {
        const responseCode = error.response?.status || 0;
        const responseBody = error.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : error.message;
        await db_1.prisma.deliveryAttempt.update({
            where: { id: deliveryAttempt.id },
            data: {
                status: 'FAILED',
                responseCode,
                responseBody
            }
        });
        throw new Error(`Delivery failed to ${url} with code ${responseCode}: ${error.message}`);
    }
}, {
    connection,
    // Provide exponential backoff strategy for this worker queue
    settings: {
        backoffStrategy: (attemptsMade, type, err) => {
            return Math.pow(2, attemptsMade) * 1000;
        }
    }
});
exports.deliveryWorker.on('failed', (job, err) => {
    console.log(`Delivery Job ${job?.id} attempt failed. Backing off via BullMQ...`);
});
console.log('Delivery Processor Worker started');
