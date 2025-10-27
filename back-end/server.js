import express from 'express';
import cors from 'cors';
import { askZere } from './ai/app.js';

const app = express();
app.use(cors());
app.use(express.json());

// Только один endpoint - /ai
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

app.listen(3000, () => {
    console.log('🚀 Zere AI Server running on http://localhost:3000');
    console.log('📋 Endpoint: POST http://localhost:3000/ai');
});