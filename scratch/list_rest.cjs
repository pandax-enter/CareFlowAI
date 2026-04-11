
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API Key found");
    return;
  }

  // Try v1 instead of v1beta
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
      console.log("Error:", data.error.message);
    } else {
      console.log("--- Available Models (v1) ---");
      data.models.forEach(m => console.log(m.name));
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

listModels();
