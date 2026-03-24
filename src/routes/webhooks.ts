import { Router } from 'express';
import { prisma } from '../db';
import { webhookQueue } from '../queue';

const router = Router();

router.post('/:pipelineId', async (req, res) => {
  const { pipelineId } = req.params;
  const payload = req.body;

  try {
    // 1. Verify pipeline exists
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId }
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // 2. Create Job in DB
    const job = await prisma.job.create({
      data: {
        pipelineId,
        originalPayload: payload,
        status: 'PENDING'
      }
    });

    // 3. Enqueue for background processing
    await webhookQueue.add('process-webhook', {
      jobId: job.id,
      pipelineId,
      payload
    });

    res.status(202).json({
      message: 'Webhook received and queued for processing',
      jobId: job.id
    });
  } catch (error) {
    console.error('Error ingesting webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
