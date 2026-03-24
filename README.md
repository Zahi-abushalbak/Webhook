# Webhook-Driven Task Processing Pipeline

A simplified "Zapier-like" service that receives webhooks, processes them in the background (Transform, Filter, Enrich), and forwards the results to subscribers.

## 🚀 Quick Start

Ensure you have **Node.js 18+** and **Docker** installed.

### 1. Start Database & Redis
\`\`\`bash
docker-compose up -d
\`\`\`

### 2. Install & Setup Database
\`\`\`bash
npm install
npx prisma migrate dev --name init
\`\`\`

### 3. Run the Application
Open two separate terminals and run:

**Terminal 1 (API Server):**
\`\`\`bash
npm run dev
\`\`\`

**Terminal 2 (Background Worker):**
\`\`\`bash
npm run dev:worker
\`\`\`

---

## 🧪 How to Test

You can test the entire pipeline end-to-end using the included test script. Open a new terminal and run:

\`\`\`bash
npx tsx test.ts
\`\`\`