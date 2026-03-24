import { Router } from 'express';
import { prisma } from '../db';
import { z } from 'zod';

const router = Router();

const ActionSchema = z.object({
  type: z.enum(['TRANSFORM', 'FILTER', 'ENRICH']),
  config: z.any(),
  order: z.number().int()
});

const SubscriberSchema = z.object({
  url: z.string().url()
});

const CreatePipelineSchema = z.object({
  name: z.string(),
  actions: z.array(ActionSchema),
  subscribers: z.array(SubscriberSchema)
});

// Create a new pipeline
router.post('/', async (req, res) => {
  try {
    const data = CreatePipelineSchema.parse(req.body);
    const pipeline = await prisma.pipeline.create({
      data: {
        name: data.name,
        actions: {
          create: data.actions
        },
        subscribers: {
          create: data.subscribers
        }
      },
      include: {
        actions: true,
        subscribers: true
      }
    });
    res.status(201).json(pipeline);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List pipelines
router.get('/', async (req, res) => {
  const pipelines = await prisma.pipeline.findMany({
    include: { actions: true, subscribers: true }
  });
  res.json(pipelines);
});

// Get pipeline details
router.get('/:id', async (req, res) => {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: req.params.id },
    include: { actions: true, subscribers: true }
  });
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
  res.json(pipeline);
});

// Delete pipeline
router.delete('/:id', async (req, res) => {
  try {
    await prisma.pipeline.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Pipeline not found' });
  }
});

// Update pipeline
router.put('/:id', async (req, res) => {
  try {
    const data = CreatePipelineSchema.parse(req.body);
    // Overwrite actions and subscribers
    const pipeline = await prisma.$transaction(async (tx) => {
      await tx.action.deleteMany({ where: { pipelineId: req.params.id } });
      await tx.subscriber.deleteMany({ where: { pipelineId: req.params.id } });
      
      return await tx.pipeline.update({
        where: { id: req.params.id },
        data: {
          name: data.name,
          actions: { create: data.actions },
          subscribers: { create: data.subscribers }
        },
        include: { actions: true, subscribers: true }
      });
    });
    res.json(pipeline);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
