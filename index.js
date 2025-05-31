import 'dotenv/config'; 
import express from 'express';
import vine from '@vinejs/vine';
import schema from './validator.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import os from 'os';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json' assert { type: "json" };

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 7000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/recommend-database', async (req, res) => {
  try {
    // Validate request body
    const validator = vine.compile(schema);
    const payload = await validator.validate(req.body);

    const {
      productCategory, dataSize, initialUsers, readWritePattern,
      schemaChangeFrequency, dataAccuracyImportance, scalabilityImportance,
      budget, userGeography, latencyImportance
    } = payload;

    // Construct the prompt
    const prompt = `
You are a senior-level Database Architect AI with deep expertise in database systems, including relational (SQL), NoSQL (document, key-value, columnar, graph), NewSQL, time-series, vector databases, and cloud-native databases. You understand the principles of the CAP theorem, ACID vs BASE properties, horizontal scaling, global distribution, and modern SaaS/database infrastructure trade-offs.

You have studied thousands of real-world products across industries—like how **Amazon and Etsy use PostgreSQL**, **Netflix uses Cassandra**, **LinkedIn uses both document and graph databases**, or **healthcare platforms prefer strongly consistent SQL databases due to compliance**. Your job is to think like a **startup advisor and database strategist**.

**Instructions:**

1. Analyze the given product details below in key-value format.
2. Based on the inputs, recommend the most suitable database for the product or MVP (Minimum Viable Product).
3. Consider factors such as scalability, cost, consistency, performance, flexibility of schema, and query patterns.
4. If a specialized database (e.g., vector DB, graph DB, etc.) fits better than general-purpose DBs, suggest that.
5. Your recommendation must be **practical**, **balanced**, and **real-world usable**.
6. Keep the explanation clear for technical and non-technical stakeholders.

### Input Requirements:

productCategory: ${productCategory}  
dataSize: ${dataSize}  
initialUsers: ${initialUsers}  
readWritePattern: ${readWritePattern}  
schemaChangeFrequency: ${schemaChangeFrequency}  
dataAccuracyImportance: ${dataAccuracyImportance}  
scalabilityImportance: ${scalabilityImportance}  
budget: ${budget}  
userGeography: ${userGeography}  
latencyImportance: ${latencyImportance}

### Output Format:

- 🧠 **Recommended Database:** [Database Name]  
- 📄 **Summary:** [2 to 3 short, personalized, and clear lines explaining why this database fits best, highlighting key tradeoffs and benefits in plain language.]

Ensure the recommendation aligns with real-world product goals and avoids overengineering. Respond concisely.
`;

    // Load Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ recommendation: text });
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err?.messages || 'Validation failed or AI request error'
    });
  }
});


app.get('/ping', (req, res) => {
  res.send('pong');
});


app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemMB = ((totalMem - freeMem) / 1024 / 1024).toFixed(2);
  const totalMemMB = (totalMem / 1024 / 1024).toFixed(2);
  const cpuLoad = os.loadavg(); // [1m, 5m, 15m] load avg
  const uptime = os.uptime(); // in seconds

  res.json({
    status: 'OK',
    system: {
      uptime: `${Math.floor(uptime / 60)} minutes`,
      cpuLoadAvg: {
        '1min': cpuLoad[0].toFixed(2),
        '5min': cpuLoad[1].toFixed(2),
        '15min': cpuLoad[2].toFixed(2),
      },
      memory: {
        usedMB: usedMemMB,
        totalMB: totalMemMB,
        freeMB: (freeMem / 1024 / 1024).toFixed(2),
      },
      processMemoryMB: {
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      },
      platform: os.platform(),
      arch: os.arch(),
      cores: os.cpus().length,
    },
  });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => console.log(`🚀 DBMatch Server running on Port No:${PORT}`));
