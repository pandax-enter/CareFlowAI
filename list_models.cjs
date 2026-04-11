const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listAllModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        if (data.models) {
             const names = data.models.map(m => m.name);
             console.log("AVAILABLE MODELS:", names);
        } else {
             console.log("Response:", data);
        }
    } catch(e) {
        console.error(e);
    }
}
listAllModels();
