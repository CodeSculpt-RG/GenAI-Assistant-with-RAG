import 'dotenv/config';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
globalThis.fetch = fetch;
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vectorStorePath = join(__dirname, '../data/vector_store.json');
const vectorStore = JSON.parse(readFileSync(vectorStorePath, 'utf-8'));

function dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function magnitude(a) {
    return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarity(a, b) {
    return dotProduct(a, b) / (magnitude(a) * magnitude(b));
}

async function diagnose(query) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    console.log(`Diagnosing query: "${query}"`);
    try {
        const embedResult = await model.embedContent(query);
        const queryVector = embedResult.embedding.values;

        const scores = vectorStore.map(chunk => ({
            title: chunk.title,
            score: cosineSimilarity(queryVector, chunk.embedding)
        }));

        scores.sort((a, b) => b.score - a.score);

        console.log('Top 5 similarity scores:');
        scores.slice(0, 5).forEach((s, i) => {
            console.log(`${i + 1}. ${s.title}: ${s.score.toFixed(4)}`);
        });
    } catch (err) {
        console.error('Error during diagnosis:', err.message);
    }
}

diagnose('bill info');
