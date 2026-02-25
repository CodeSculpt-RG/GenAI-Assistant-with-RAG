// scripts/ingest.js
// Run this script ONCE to generate embeddings for all document chunks.
// Usage: npm run ingest
// Output: backend/data/vector_store.json

import 'dotenv/config';
import fetch from 'node-fetch';
globalThis.fetch = fetch;
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CHUNK_SIZE_CHARS = 1500; // ~300-350 words
const CHUNK_OVERLAP_CHARS = 200; // ~50 words overlap
const EMBEDDING_MODEL = 'gemini-embedding-001';

// ----- Chunking -----
function chunkText(text, chunkSize = CHUNK_SIZE_CHARS, overlap = CHUNK_OVERLAP_CHARS) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end).trim());
        if (end === text.length) break;
        start += chunkSize - overlap;
    }

    return chunks;
}

// ----- Main Ingestion -----
async function ingest() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY is not set. Create a .env file with your key.');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

    const docsPath = join(__dirname, '../data/docs.json');
    const docs = JSON.parse(readFileSync(docsPath, 'utf-8'));
    console.log(`📚 Loaded ${docs.length} documents from docs.json`);

    const vectorStore = [];
    let chunkIndex = 0;

    for (const doc of docs) {
        const chunks = chunkText(doc.content);
        console.log(`  → "${doc.title}": ${chunks.length} chunk(s)`);

        for (let i = 0; i < chunks.length; i++) {
            const chunkContent = chunks[i];

            try {
                const result = await embeddingModel.embedContent(chunkContent);
                const embedding = result.embedding.values;

                vectorStore.push({
                    id: `${doc.id}-chunk-${i + 1}`,
                    docId: doc.id,
                    title: doc.title,
                    chunkIndex: i,
                    content: chunkContent,
                    embedding,
                });

                chunkIndex++;
                console.log(`    ✅ Chunk ${i + 1}/${chunks.length} embedded (dim: ${embedding.length})`);

                // Small delay to avoid hitting rate limits
                if (chunkIndex < docs.length * 2) {
                    await new Promise((r) => setTimeout(r, 100));
                }
            } catch (err) {
                console.error(`    ❌ Failed to embed chunk ${i + 1} of "${doc.title}":`, err.message);
                process.exit(1);
            }
        }
    }

    const outputPath = join(__dirname, '../data/vector_store.json');
    writeFileSync(outputPath, JSON.stringify(vectorStore, null, 2));
    console.log(`\n✨ Done! ${vectorStore.length} chunks saved to data/vector_store.json`);
}

ingest();
