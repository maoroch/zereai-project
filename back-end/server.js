import express from 'express';
import cors from 'cors';
import { askZere } from './ai/app.js';
import dotenv from "dotenv";
import session from "express-session";
import crmCrud from "./CRM/crud.js";
import excelRouter from './CRM/excel.js';
import gradient from 'gradient-string';

const app = express();

// --- Настройка CORS первым делом ---
app.use(cors({
  origin: true,
  credentials: true
}));

// --- Парсинг JSON ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

dotenv.config();

// --- Сессии ---
app.use(
  session({
    secret: "curator-secret",
    resave: false,
    saveUninitialized: false,
  })
);

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

// Debug middleware для excelRouter
app.use('/excelRouter', (req, res, next) => {
  console.log(`📨 Excel Router: ${req.method} ${req.path}`);
  next();
});

app.use('/excelRouter', excelRouter);

// --- 404 Handler (ИСПРАВЛЕННЫЙ) ---
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
});