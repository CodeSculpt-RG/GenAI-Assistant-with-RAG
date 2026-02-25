// rag.js — Core RAG Pipeline
// 1. Embed the user query
// 2. Retrieve top-K relevant chunks via cosine similarity
// 3. Build an augmented prompt
// 4. Call Gemini LLM and return structured result

import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveTopK } from './vector_math.js';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-2.5-flash';
const TEMPERATURE = 0.2;
const TOP_K_RESULTS = 3;

let genAI;
let embeddingModel;
let chatModel;

export function initRAG(apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    chatModel = genAI.getGenerativeModel({
        model: CHAT_MODEL,
        generationConfig: {
            temperature: TEMPERATURE,
            maxOutputTokens: 1024,
        },
    });
}

/**
 * Build the augmented prompt from retrieved context and conversation history.
 */
function buildPrompt(retrievedChunks, history, userMessage) {
    // Format retrieved context
    const contextBlock =
        retrievedChunks.length > 0
            ? retrievedChunks
                .map((chunk, i) => `[${i + 1}] (Source: "${chunk.title}", Relevance: ${(chunk.score * 100).toFixed(1)}%)\n${chunk.content}`)
                .join('\n\n')
            : 'No relevant context found.';

    // Format conversation history
    const historyBlock =
        history.length > 0
            ? history
                .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n')
            : 'No previous conversation.';

    return `You are a helpful, accurate support assistant. Your responses must be based ONLY on the provided context below. 
If the context does not contain enough information to answer the question, honestly say: "I don't have enough information in my knowledge base to answer that question accurately. Please contact support for further help."
Do NOT make up information or use outside knowledge.

---
CONTEXT FROM KNOWLEDGE BASE:
${contextBlock}

---
CONVERSATION HISTORY:
${historyBlock}

---
USER QUESTION:
${userMessage}

ANSWER:`;
}

/**
 * Main RAG pipeline function.
 * @param {string}   userMessage  - The user's current question
 * @param {Array}    vectorStore  - Array of embedded document chunks
 * @param {Array}    history      - Conversation history (role, content)
 * @param {number}   threshold    - Minimum cosine similarity score
 * @returns {Object} { reply, tokensUsed, retrievedChunks, scores }
 */
export async function runRAGPipeline(userMessage, vectorStore, history, threshold = 0.65) {
    // Step 1: Embed the user query
    let queryEmbedding;
    try {
        const embedResult = await embeddingModel.embedContent(userMessage);
        queryEmbedding = embedResult.embedding.values;
    } catch (err) {
        throw new Error(`Embedding API error: ${err.message}`);
    }

    // Step 2: Retrieve top-K relevant chunks
    const topChunks = retrieveTopK(queryEmbedding, vectorStore, TOP_K_RESULTS, threshold);

    // Step 3: If no chunks meet threshold, return a safe fallback
    if (topChunks.length === 0) {
        return {
            reply:
                "I'm sorry, I couldn't find relevant information in my knowledge base to answer your question. For more help, please contact our support team at support@company.com.",
            tokensUsed: 0,
            retrievedChunks: 0,
            scores: [],
            fallback: true,
        };
    }

    // Step 4: Build augmented prompt
    const prompt = buildPrompt(topChunks, history, userMessage);

    // Step 5: Call LLM
    let llmResponse;
    try {
        const result = await chatModel.generateContent(prompt);
        llmResponse = result.response;
    } catch (err) {
        throw new Error(`LLM API error: ${err.message}`);
    }

    const reply = llmResponse.text();
    const usageMetadata = llmResponse.usageMetadata;

    return {
        reply,
        tokensUsed: usageMetadata
            ? (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0)
            : 0,
        retrievedChunks: topChunks.length,
        scores: topChunks.map((c) => ({ title: c.title, score: parseFloat(c.score.toFixed(4)) })),
        fallback: false,
    };
}
