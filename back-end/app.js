import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import env from './config/env.js';
import requestLogger from './middlewares/logger.middleware.js';
import errorMiddleware from './middlewares/error.middleware.js';

import healthRoutes from './routes/health.routes.js';
import aiRoutes     from './routes/ai.routes.js';
import authRoutes   from './routes/auth.routes.js';
import crmRoutes    from './routes/crm.routes.js';
import excelRoutes  from './routes/excel.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept'],
}));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../front-end')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/',      (_req, res) => res.sendFile(path.join(__dirname, '../front-end/login.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '../front-end/admin.html')));

app.use('/health',               healthRoutes);
app.use('/ai',                   aiRoutes);
app.use('/auth',                 authRoutes);
app.use('/crmCrud',              crmRoutes);
app.use('/crmCrud/excelRouter',  excelRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
