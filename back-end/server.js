import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { askZere } from './ai/app.js';
import dotenv from "dotenv";
import crmCrud from "./CRM/crud.js";
import excelRouter from './CRM/excel.js';
import gradient from 'gradient-string';
import authRoute from './CRM/authRoute.js';
import path from 'path';
import { fileURLToPath } from 'url';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ------------------- Парсинг -------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // ← ДОБАВЛЕНО для работы с cookies
dotenv.config();

// ------------------- CORS -------------------
const isProd = process.env.NODE_ENV === 'production';
const corsOrigins = [
  'https://zere-six.vercel.app',
  'https://ai-zere.vercel.app',
  'https://zereai-sparkling-wind-4294.fly.dev',
  'http://localhost:3000'
];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'X-Requested-With',
    'Accept',
  ],
}));

// ------------------- Статические файлы -------------------
app.use(express.static(path.join(__dirname, '../front-end')));

// ------------------- Debug -------------------
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Cookies:', req.cookies?.auth_token ? '✅ auth_token' : '❌ нет');
  next();
});

// ------------------- Health -------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Zere AI Server is running',
  });
});

// ------------------- AI endpoint -------------------
app.post('/ai', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ success: false, error: 'Question is required' });
  }
  try {
    console.log(`📥 Question: ${question}`);
    const answer = await askZere(question);
    res.json({ success: true, answer, question, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('❌ AI Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------- Маршруты -------------------
app.use('/crmCrud', crmCrud);
app.use('/auth', authRoute);

app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, '../front-end/login.html'))
);
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '../front-end/admin.html'))
);

app.use('/crmCrud/excelRouter', (req, res, next) => {
  console.log(`📨 Excel: ${req.method} ${req.path}`);
  next();
});
app.use('/crmCrud/excelRouter', excelRouter);

// ------------------- 404 -------------------
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ------------------- Баннер -------------------
const banner = `
===============================
       Zere AI — © 2025 Ilyas Salimov
       Telegram: @Ilyas_ones
       Crafted with passion ✨
===============================
`;
console.log(gradient.morning(banner));

// ------------------- ЗАПУСК -------------------
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Environment: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`🔐 CORS: ${corsOrigins.join(', ')}`);
  console.log(`🎟️  Auth method: JWT (stateless)`);
});
