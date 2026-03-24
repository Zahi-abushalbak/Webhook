"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryQueue = exports.webhookQueue = void 0;
const bullmq_1 = require("bullmq");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
// Queue for processing the ingested webhook (executing actions)
exports.webhookQueue = new bullmq_1.Queue('webhook-jobs', { connection });
// Queue for delivering the processed payload to subscribers
exports.deliveryQueue = new bullmq_1.Queue('delivery-jobs', { connection });
