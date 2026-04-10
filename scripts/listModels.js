import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    try {
        // There is no direct listModels in the client GenAI object usually, 
        // you have to fetch it or try a known working one.
        // Let's try gemini-pro (the original 1.0)
        const result = await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent("test");
        console.log("gemini-pro works");
    } catch (e) {
        console.log("gemini-pro failed:", e.message);
    }
}

listModels();
