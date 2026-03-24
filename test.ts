import axios from 'axios';

async function runTest() {
  console.log('1. Creating a new Pipeline...');
  const pipelineRes = await axios.post<{ id: string }>('http://localhost:3000/api/pipelines', {
    name: 'Automated Test Pipeline',
    actions: [
      { type: 'TRANSFORM', config: { map: { orderId: 'id', amount: 'amount', customerName: 'customer' } }, order: 1 },
      { type: 'FILTER', config: { field: 'amount', operator: '>', value: 50 }, order: 2 },
      { type: 'ENRICH', config: { appendTimestamp: true, staticData: { processedBy: 'NodeJS Script' } }, order: 3 }
    ],
    subscribers: [{ url: 'https://httpstat.us/200' }]
  });
  
  const pipelineId = pipelineRes.data.id;
  console.log(`✅ Pipeline Created successfully with ID: ${pipelineId}\n`);

  console.log('2. Sending a Mock Webhook Payload...');
  const webhookRes = await axios.post<{ jobId: string }>(`http://localhost:3000/api/webhooks/${pipelineId}`, {
    id: 'TXN-999',
    amount: 150,
    customer: 'Alice Wonderland'
  });
  
  const jobId = webhookRes.data.jobId;
  console.log(`✅ Webhook queued successfully! Job ID: ${jobId}\n`);

  console.log('3. Waiting for background workers to finish (2 seconds)...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('4. Fetching the final Job status from the Database...');
  const jobRes = await axios.get(`http://localhost:3000/api/jobs/${jobId}`);
  
  console.log('\n--- RESULT ---');
  console.dir(jobRes.data, { depth: null, colors: true });
}

runTest().catch(err => {
  console.error('Test failed:', err.response?.data || err.message);
});
