# Webhook-Driven Task Processing Pipeline

A simplified "Zapier-like" service that receives webhooks, processes them in the background (Transform, Filter, Enrich), and forwards the results to subscribers.

## 🚀 Quick Start

Ensure you have **Node.js 18+** and **Docker** installed.

### 1. Start Database & Redis
\`\`\`bash
docker-compose up -d
\`\`\`

### 2. Setup Environment Variables
Clone this repository, then create a file named \`.env\` in the root directory and paste the following:

\`\`\`env
DATABASE_URL=postgresql://webhook_user:webhook_password@localhost:5432/webhook_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
\`\`\`

### 3. Install & Setup Database
\`\`\`bash
npm install
npx prisma generate
npx prisma migrate dev --name init
\`\`\`

### 3. Run the Application
Open two separate terminals and run:

**Terminal 1 (API Server):**
\`\`\`bash
npm run dev
\`\`\`
```

**Terminal 2 (Background Worker):**
```bash
npm run dev:worker
```

## 🧪 Testing

### 1. Automated Test
Run the full end-to-end suite with one command:
```bash
npx tsx test.ts
```

### 2. Manual Testing (PowerShell Examples)
You can test each action type manually by creating a pipeline and sending a webhook.

#### **A. Transform Action (Rename Fields)**
```powershell
# Create Pipeline
$Pipe = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/pipelines" -ContentType "application/json" -Body '{
  "name": "Transform Test",
  "actions": [{ "type": "TRANSFORM", "config": { "map": { "orderID": "id" } }, "order": 1 }],
  "subscribers": [{ "url": "https://httpstat.us/200" }]
}'

# Send Webhook (Input "id" becomes "orderID" in output)
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/webhooks/$($Pipe.id)" -ContentType "application/json" -Body '{"id": "777"}'
```

#### **B. Filter Action (Conditional Drop)**
```powershell
# Create Pipeline (Only allows amount > 100)
$Pipe = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/pipelines" -ContentType "application/json" -Body '{
  "name": "Filter Test",
  "actions": [{ "type": "FILTER", "config": { "field": "amount", "operator": ">", "value": 100 }, "order": 1 }],
  "subscribers": [{ "url": "https://httpstat.us/200" }]
}'

# Test (This will be FILTERED and not delivered)
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/webhooks/$($Pipe.id)" -ContentType "application/json" -Body '{"amount": 50}'
```

#### **C. Enrich Action (Adding Metadata)**
```powershell
# Create Pipeline
$Pipe = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/pipelines" -ContentType "application/json" -Body '{
  "name": "Enrich Test",
  "actions": [{ "type": "ENRICH", "config": { "appendTimestamp": true }, "order": 1 }],
  "subscribers": [{ "url": "https://httpstat.us/200" }]
}'

# Send Webhook (Output will have a "_processedAt" field)
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/webhooks/$($Pipe.id)" -ContentType "application/json" -Body '{"data": "hello"}'
```