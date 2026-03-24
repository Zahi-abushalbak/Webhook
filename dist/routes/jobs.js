"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// List all jobs
router.get('/', async (req, res) => {
    const { pipelineId, status, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (pipelineId)
        where.pipelineId = String(pipelineId);
    if (status)
        where.status = String(status);
    const jobs = await db_1.prisma.job.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
    });
    const total = await db_1.prisma.job.count({ where });
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
    const job = await db_1.prisma.job.findUnique({
        where: { id: req.params.id },
        include: { deliveries: true }
    });
    if (!job)
        return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});
exports.default = router;
