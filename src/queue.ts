import { Queue } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Queue for processing the ingested webhook (executing actions)
export const webhookQueue = new Queue('webhook-jobs', { connection });

// Queue for delivering the processed payload to subscribers
export const deliveryQueue = new Queue('delivery-jobs', { connection });
