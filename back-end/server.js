import express from 'express';
import cors from 'cors';
import { askZere } from './ai/app.js';
import dotenv from "dotenv";
import session from "express-session";
import crmCrud from "./CRM/crud.js";
import excelRouter from './CRM/excel.js';
import gradient from 'gradient-string';
import authRoute from './CRM/authRoute.js'
import { requireAuth } from "./CRM/auth/requireAuth.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Парсинг JSON ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

dotenv.config();

// --- Настройка CORS ---
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'X-Requested-With',
    'Accept'
  ]
}));

// --- Сессии ---
app.use(
  session({
    name: 'zere.sid',
    secret: "curator-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  })
);

// --- Статическая раздача файлов ---
// Предполагая, что ваши HTML файлы находятся в папке на одном уровне с back-end
app.use(express.static(path.join(__dirname, '../front-end')));

// Middleware для отладки сессий
app.use((req, res, next) => {
  console.log('=== SESSION DEBUG ===');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Headers.cookie:', req.headers.cookie);
  console.log('=====================');
  next();
});

// --- Health check endpoint ---
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Zere AI Server is running',
        availableModels: ['deepseek-r1:8b'] 
    });
});

// --- AI endpoint ---
app.post('/ai', async (req, res) => {
    const { question } = req.body;
    
    if (!question) {
        return res.status(400).json({ 
            success: false, 
            error: 'Question is required' 
        });
    }

    try {
        console.log(`📥 Received question: ${question}`);
        const answer = await askZere(question);
        
        res.json({ 
            success: true, 
            answer: answer,
            question: question,
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        console.error('❌ Error in /ai:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// --- Маршруты ---
app.use("/crmCrud", crmCrud);
app.use("/auth", authRoute);

// --- Роуты для HTML страниц ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../front-end/login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../front-end/admin.html'));
});

// Debug middleware для excelRouter
app.use('/excelRouter', (req, res, next) => {
  console.log(`📨 Excel Router: ${req.method} ${req.path}`);
  next();
});

app.use('/excelRouter', excelRouter);

// --- 404 Handler ---
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.method} ${req.originalUrl} not found` 
  });
});

// --- Баннер ---
const banner = `
===============================
       Zere AI — © 2025 Ilyas Salimov
       All rights reserved.
       Telegram: @Ilyas_ones

Team:
  🚀 CEO, CTO                     — Ilyas Salimov
  🤖 Back-end, Telegram Developer — Borodin Alexander, Ali Duisen

       ✨ Crafted with passion ✨
===============================
`;

console.log(gradient.morning(banner));

app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
    console.log('📋 Available endpoints:');
    console.log('   GET  http://localhost:3000/health');
    console.log('   POST http://localhost:3000/ai');
    console.log('   POST http://localhost:3000/excelRouter/upload-groups');
    console.log('   GET  http://localhost:3000/ - Login page');
    console.log('   GET  http://localhost:3000/admin - Admin panel');
});