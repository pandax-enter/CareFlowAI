import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
    console.log("Fetching available models...");
    try {
        const modelsToTest = [
            "gemini-2.0-flash-lite-001", 
            "gemini-2.5-flash-lite", 
            "gemini-3.1-flash-lite-preview",
            "gemini-flash-lite-latest",
            "gemma-3-e4b-it",
            "gemma-3-1b-it"
        ];
        for(const m of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const res = await model.generateContent("Hello.");
                console.log(`✅ ${m} worked!`);
                // Break if one works to test which one is active
                break;
            } catch(e) {
                console.log(`❌ ${m} failed: ${e.message}`);
            }
        }
    } catch(err) {
        console.error(err);
    }
}
run();
