import 'dotenv/config'; 
import express from 'express';
import vine from '@vinejs/vine';
import schema from './validator.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import os from 'os';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json' assert { type: "json" };
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import cors from 'cors';


const app = express();
app.use(express.json());
const PORT = process.env.PORT || 7000;


app.use(cors({
  origin: '*'
}));  //…but it’s functionally the same as just: app.use(cors());

// Secure HTTP headers
app.use(helmet());

// Rate limiter 
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 7,
  message: {
    error: 'Too many requests, please try again later.'
  }
});
app.use(limiter);

// 🚀 Slow down repeated requests instead of blocking immediately
// so insted of blaking we alow down aggresive devs 👨🏻‍💻
const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 3, // Allow 3 requests before slowing down
  delayMs: () => 1000, // Add 1 second delay per request after the limit
});
app.use(speedLimiter);




const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DBMatch API ⚙️</title>
  <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/2733/2733990.png" type="image/x-icon" />
  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      margin: 0; padding: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #eef2f7;
      color: #2c3e50;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 20px;
    }
    p {
      font-size: 1.2rem;
      margin: 10px 0;
      max-width: 600px;
    }
    a {
      color: #2980b9;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.3s ease;
    }
    a:hover {
      color: #1c5980;
    }
    .cta-button {
      margin-top: 20px;
      padding: 15px 30px;
      font-size: 1.2rem;
      color: white;
      background-color: #27ae60;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
    .cta-button:hover {
      background-color: #219150;
    }
    .footer {
      margin-top: 40px;
      font-size: 0.9rem;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <h1>Welcome to DBMatch API ⚙️</h1>
  <p>Your intelligent assistant for choosing the perfect database technology tailored to your product's needs.</p>
  <p>Input your product details, and get practical, balanced, real-world database recommendations — no more guesswork.</p>
  <p>To explore the API endpoints and documentation, head over to: <a href="/docs">/docs</a></p>
  <button class="cta-button" onclick="window.location.href='/docs'">Get Started</button>
  <div class="footer">
    <p>Created with passion by database enthusiasts.</p>
    <p>Questions or feedback? Contact us at <a href="mailto:prajapatikashyap14@gmail.com">prajapatikashyap14@gmail.com</a></p>
  </div>
</body>
</html>`);
});


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
