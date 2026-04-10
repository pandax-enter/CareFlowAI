import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    try {
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent("test");
        console.log("gemini-1.5-flash works");
    } catch (e) {
        console.log("gemini-1.5-flash failed:", e.message);
    }

    try {
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-pro" }).generateContent("test");
        console.log("gemini-1.5-pro works");
    } catch (e) {
        console.log("gemini-1.5-pro failed:", e.message);
    }
}

checkModels();
