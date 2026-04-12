const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModels() {
    console.log("Fetching available models...");
    try {
        // We will just try a few known ones
        const modelsToTest = ["gemini-2.5-flash-lite-preview-02-05"];
        for(const m of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const res = await model.generateContent("hello");
                console.log(`✅ ${m} works! Response: ${res.response.text()}`);
            } catch (e) {
                console.log(`❌ ${m} failed: ${e.message}`);
            }
        }
    } catch(e) {
        console.error("Global error", e);
    }
}
checkModels();
