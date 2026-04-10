import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
  try {
    const result = await genAI.getGenerativeModel({model: "gemini-3-flash-preview"}).generateContent("test");
    console.log("Success with gemini-3-flash-preview");
    console.log("Result:", result.response.text());
  } catch (e) {
    console.error("Failed with gemini-3-flash-preview: " + e.message);
  }
  
  try {
    console.log("Fetching list of available models...");
    // Using simple fetch to bypass SDK version issues if any
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => console.log(m.name));
    } else {
      console.log("No models returned. API Key might be restricted.", data);
    }
  } catch (e) {
    console.error("Error listing models:", e.message);
  }
}

run();
