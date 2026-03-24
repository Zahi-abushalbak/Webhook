"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const ActionSchema = zod_1.z.object({
    type: zod_1.z.enum(['TRANSFORM', 'FILTER', 'ENRICH']),
    config: zod_1.z.any(),
    order: zod_1.z.number().int()
});
const SubscriberSchema = zod_1.z.object({
    url: zod_1.z.string().url()
});
const CreatePipelineSchema = zod_1.z.object({
    name: zod_1.z.string(),
    actions: zod_1.z.array(ActionSchema),
    subscribers: zod_1.z.array(SubscriberSchema)
});
// Create a new pipeline
router.post('/', async (req, res) => {
    try {
        const data = CreatePipelineSchema.parse(req.body);
        const pipeline = await db_1.prisma.pipeline.create({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// List pipelines
router.get('/', async (req, res) => {
    const pipelines = await db_1.prisma.pipeline.findMany({
        include: { actions: true, subscribers: true }
    });
    res.json(pipelines);
});
// Get pipeline details
router.get('/:id', async (req, res) => {
    const pipeline = await db_1.prisma.pipeline.findUnique({
        where: { id: req.params.id },
        include: { actions: true, subscribers: true }
    });
    if (!pipeline)
        return res.status(404).json({ error: 'Pipeline not found' });
    res.json(pipeline);
});
// Delete pipeline
router.delete('/:id', async (req, res) => {
    try {
        await db_1.prisma.pipeline.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ error: 'Pipeline not found' });
    }
});
// Update pipeline
router.put('/:id', async (req, res) => {
    try {
        const data = CreatePipelineSchema.parse(req.body);
        // Overwrite actions and subscribers
        const pipeline = await db_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
