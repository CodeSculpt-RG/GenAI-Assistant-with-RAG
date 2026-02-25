import 'dotenv/config';
import fetch from 'node-fetch';
globalThis.fetch = fetch;
import { GoogleGenerativeAI } from '@google/generative-ai';

async function list() {
    console.log('Fetching models...');
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        const chatModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        console.log('Available chat models:');
        chatModels.forEach(m => console.log(`- ${m.name}`));
    } catch (e) {
        console.error(e);
    }
}
list();
