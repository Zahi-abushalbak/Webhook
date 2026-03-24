import { Worker, Job as BullJob } from 'bullmq';
import { prisma } from './db';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const deliveryWorker = new Worker(
  'delivery-jobs',
  async (bullJob: BullJob) => {
    const { jobId, subscriberId, url, payload } = bullJob.data;

    let deliveryAttempt = await prisma.deliveryAttempt.create({
      data: {
        jobId,
        subscriberId,
        status: 'PENDING'
      }
    });

    try {
      const response = await axios.post(url, payload, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });

      await prisma.deliveryAttempt.update({
        where: { id: deliveryAttempt.id },
        data: {
          status: 'SUCCESS',
          responseCode: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000)
        }
      });
      
      console.log(`Successfully delivered job ${jobId} to ${url}`);
    } catch (error: any) {
      const responseCode = error.response?.status || 0;
      const responseBody = error.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : error.message;

      await prisma.deliveryAttempt.update({
        where: { id: deliveryAttempt.id },
        data: {
          status: 'FAILED',
          responseCode,
          responseBody
        }
      });

      throw new Error(`Delivery failed to ${url} with code ${responseCode}: ${error.message}`);
    }
  },
  { 
    connection,
    // Provide exponential backoff strategy for this worker queue
    settings: {
      backoffStrategy: (attemptsMade: number, type: string | undefined, err: Error | undefined) => {
        return Math.pow(2, attemptsMade) * 1000;
      }
    }
  }
);

deliveryWorker.on('failed', (job, err) => {
  console.log(`Delivery Job ${job?.id} attempt failed. Backing off via BullMQ...`);
});

console.log('Delivery Processor Worker started');
