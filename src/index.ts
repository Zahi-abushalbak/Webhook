import express from 'express';
import dotenv from 'dotenv';
import pipelineRoutes from './routes/pipelines';
import webhookRoutes from './routes/webhooks';
import jobRoutes from './routes/jobs';

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/pipelines', pipelineRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/jobs', jobRoutes);

app.listen(port, () => {
  console.log(`API Server listening on port ${port}`);
});
