"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const queue_1 = require("../queue");
const router = (0, express_1.Router)();
router.post('/:pipelineId', async (req, res) => {
    const { pipelineId } = req.params;
    const payload = req.body;
    try {
        // 1. Verify pipeline exists
        const pipeline = await db_1.prisma.pipeline.findUnique({
            where: { id: pipelineId }
        });
        if (!pipeline) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }
        // 2. Create Job in DB
        const job = await db_1.prisma.job.create({
            data: {
                pipelineId,
                originalPayload: payload,
                status: 'PENDING'
            }
        });
        // 3. Enqueue for background processing
        await queue_1.webhookQueue.add('process-webhook', {
            jobId: job.id,
            pipelineId,
            payload
        });
        res.status(202).json({
            message: 'Webhook received and queued for processing',
            jobId: job.id
        });
    }
    catch (error) {
        console.error('Error ingesting webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
