import express from 'express';
import cors from 'cors';
import { askZere } from './ai/app.js';

import dotenv from "dotenv";
import session from "express-session";
import crmCrud from "./CRM/crud.js";


const app = express();
app.use(cors());
app.use(express.json());


dotenv.config();


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Zere AI Server is running',
        availableModels: ['deepseek-r1:8b'] 
    });
});

// AI endpoint
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


// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- Сессии ---
app.use(
  session({
    secret: "curator-secret",
    resave: false,
    saveUninitialized: false,
  })
);


app.use("/crmCrud", crmCrud);


app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
    console.log('📋 Available endpoints:');
    console.log('   GET  http://localhost:3000/health');
    console.log('   POST http://localhost:3000/ai');
});