
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("No API key found in .env.local");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.error) {
        console.error("API Error:", parsed.error.message);
      } else {
        console.log("--- Available Models ---");
        parsed.models.forEach(m => console.log(m.name));
      }
    } catch (e) {
      console.error("Parse Error:", e.message);
      console.log("Raw Response:", data);
    }
  });
}).on('error', (err) => {
  console.error("Request Error:", err.message);
});
