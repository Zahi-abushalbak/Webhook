import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

// List all jobs
router.get('/', async (req, res) => {
  const { pipelineId, status, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (pipelineId) where.pipelineId = String(pipelineId);
  if (status) where.status = String(status);

  const jobs = await prisma.job.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: { createdAt: 'desc' }
  });
  
  const total = await prisma.job.count({ where });

  res.json({
    data: jobs,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit)
    }
  });
});

// Get job details including delivery attempts
router.get('/:id', async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { deliveries: true }
  });

  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

export default router;
