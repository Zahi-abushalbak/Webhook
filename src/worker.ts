import { Worker, Job as BullJob } from 'bullmq';
import { prisma } from './db';
import { deliveryQueue } from './queue';
import dotenv from 'dotenv';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const worker = new Worker(
  'webhook-jobs',
  async (bullJob: BullJob) => {
    const { jobId, pipelineId, payload } = bullJob.data;

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' }
    });

    const pipeline = await prisma.pipeline.findUnique({
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
          const config = action.config as any;
          if (config?.map) {
            const transformed: any = {};
            for (const [newKey, oldKey] of Object.entries(config.map)) {
              transformed[newKey] = currentPayload[oldKey as string];
            }
            currentPayload = transformed;
          }
        } 
        
        else if (action.type === 'FILTER') {
          // config example: { "field": "amount", "operator": ">", "value": 100 }
          const config = action.config as any;
          const fieldValue = currentPayload[config.field];
          
          let passed = false;
          switch (config.operator) {
            case '>': passed = Number(fieldValue) > Number(config.value); break;
            case '<': passed = Number(fieldValue) < Number(config.value); break;
            case '===': passed = fieldValue === config.value; break;
            case '!==': passed = fieldValue !== config.value; break;
            default: passed = true;
          }

          if (!passed) {
            // Filter failed, stop processing
            await prisma.job.update({
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
          const config = action.config as any;
          if (config?.appendTimestamp) {
            currentPayload._processedAt = new Date().toISOString();
          }
          if (config?.staticData) {
            currentPayload = { ...currentPayload, ...config.staticData };
          }
        }
      } catch (err: any) {
        throw new Error(`Action ${action.type} failed: ${err.message}`);
      }
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        processedPayload: currentPayload
      }
    });

    // Enqueue delivery jobs to subscribers
    for (const subscriber of pipeline.subscribers) {
      await deliveryQueue.add('deliver-webhook', {
        jobId,
        subscriberId: subscriber.id,
        url: subscriber.url,
        payload: currentPayload
      });
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Webhook Job ${job.id} has completed successfully.`);
});

worker.on('failed', async (job, err) => {
  console.error(`Webhook Job ${job?.id} failed:`, err);
  if (job?.data?.jobId) {
    await prisma.job.update({
      where: { id: job.data.jobId },
      data: { status: 'FAILED' }
    }).catch(console.error);
  }
});

console.log('Webhook Processor Worker started');
