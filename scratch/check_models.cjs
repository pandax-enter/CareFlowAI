
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listAllModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  try {
    // Note: The SDK doesn't always have a direct listModels, 
    // but the REST API does. We'll try a common one or check 1.5-flash specifically.
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-001', 'gemini-1.5-flash-002', 'gemini-1.5-pro'];
    
    console.log("--- Testing Model Availability ---");
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("test");
        console.log(`✅ ${m}: SUCCESS`);
      } catch (e) {
        console.log(`❌ ${m}: FAILED - ${e.message}`);
      }
    }
  } catch (err) {
    console.error("General error:", err.message);
  }
}

listAllModels();
