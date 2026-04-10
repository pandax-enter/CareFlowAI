import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const modelsToTest = ["gemini-2.5-flash", "gemini-3-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-8b", "gemini-1.5-flash"];
    
    for (const model of modelsToTest) {
        try {
            await genAI.getGenerativeModel({ model }).generateContent("test");
            console.log(`Model ${model} WORKS`);
        } catch (e) {
            console.log(`Model ${model} FAILED: ${e.message}`);
        }
    }
}

checkModels();
