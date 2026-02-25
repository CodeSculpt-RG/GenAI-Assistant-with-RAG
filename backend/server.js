// server.js — Express backend entry point for the GenAI RAG Assistant (Updated: 2026-02-25T17:15)
import 'dotenv/config';
import fetch from 'node-fetch';
globalThis.fetch = fetch;
import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { initRAG, runRAGPipeline } from './utils/rag.js';
import {
    createSession,
    clearSession,
    sessionExists,
    getHistory,
    addMessage,
    getSessionCount,
} from './utils/sessionStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.65');

// ── Validate environment ─────────────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
    console.error('❌  GEMINI_API_KEY is not set. Copy .env.example → .env and add your key.');
    process.exit(1);
}

// ── Load vector store ────────────────────────────────────────────────────────
const vectorStorePath = join(__dirname, 'data/vector_store.json');
if (!existsSync(vectorStorePath)) {
    console.error('❌  data/vector_store.json not found. Run: npm run ingest');
    process.exit(1);
}
const vectorStore = JSON.parse(readFileSync(vectorStorePath, 'utf-8'));
console.log(`✅  Loaded ${vectorStore.length} embedded chunks from vector_store.json`);

// ── Init Gemini ──────────────────────────────────────────────────────────────
initRAG(process.env.GEMINI_API_KEY);
console.log('✅  Gemini RAG pipeline initialized');

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// Request logger
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ── Root route (if user visits backend in browser) ──────────────────────────
app.get('/', (_req, res) => {
    res.json({ message: 'RAG Assistant API is running! Open the React frontend at http://localhost:5173 to use the chat.' });
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        chunks: vectorStore.length,
        activeSessions: getSessionCount(),
        timestamp: new Date().toISOString(),
    });
});

// ── POST /api/session/new ─────────────────────────────────────────────────────
app.post('/api/session/new', (_req, res) => {
    const sessionId = uuidv4();
    createSession(sessionId);
    console.log(`🆕  New session created: ${sessionId}`);
    res.status(201).json({ sessionId });
});

// ── DELETE /api/session/:id ────────────────────────────────────────────────
app.delete('/api/session/:id', (req, res) => {
    const { id } = req.params;
    if (!sessionExists(id)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    clearSession(id);
    res.json({ message: 'Session cleared successfully' });
});

// ── POST /api/chat ─────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    // Input validation
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId is required and must be a string.' });
    }
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required and must be a string.' });
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
        return res.status(400).json({ error: 'message cannot be empty.' });
    }
    if (trimmedMessage.length > 2000) {
        return res.status(400).json({ error: 'message is too long (max 2000 characters).' });
    }

    // Auto-create session if it doesn't exist
    if (!sessionExists(sessionId)) {
        createSession(sessionId);
    }

    const history = getHistory(sessionId);

    try {
        const startTime = Date.now();
        const result = await runRAGPipeline(trimmedMessage, vectorStore, history, SIMILARITY_THRESHOLD);
        const latencyMs = Date.now() - startTime;

        // Persist to session
        addMessage(sessionId, 'user', trimmedMessage);
        addMessage(sessionId, 'model', result.reply);

        console.log(
            `💬  [${sessionId.slice(0, 8)}] chunks=${result.retrievedChunks} tokens=${result.tokensUsed} latency=${latencyMs}ms fallback=${result.fallback}`
        );

        res.json({
            reply: result.reply,
            tokensUsed: result.tokensUsed,
            retrievedChunks: result.retrievedChunks,
            scores: result.scores,
            fallback: result.fallback,
            latencyMs,
        });
    } catch (err) {
        console.error('❌  RAG pipeline error:', err.message);

        // Differentiate error types
        if (err.message.includes('API key')) {
            return res.status(401).json({ error: 'Invalid API key. Check your GEMINI_API_KEY.' });
        }
        if (err.message.includes('quota') || err.message.includes('rate')) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }
        if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
            return res.status(504).json({ error: 'Request to AI provider timed out. Please retry.' });
        }

        res.status(500).json({ error: 'An internal error occurred. Please try again.' });
    }
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀  RAG Assistant backend running on http://localhost:${PORT}`);
    console.log(`    Similarity threshold: ${SIMILARITY_THRESHOLD}`);
    console.log(`    Vector chunks loaded: ${vectorStore.length}\n`);
});
