import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req) {
  try {
    const inventory = await req.json();
    console.log('AI Inventory analysis requested.');

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Returning mock inventory response.');
      return NextResponse.json({
        analysis: "Simulated response: Several items are below safe operational thresholds.",
        actions: [
          "Order 500 units of Saline IV immediately (Current stock: 80, Usage: 50/day).",
          "Place order for 2000 units of Paracetamol by next week (Current stock: 1500, Usage: 300/day)."
        ]
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a hospital supply chain optimization AI. 
      Analyze the following inventory data. Focus on items that are nearing or below their minimum thresholds.
      
      Inventory Data: ${JSON.stringify(inventory)}

      The response MUST be a valid JSON object with:
      1. "analysis": A brief overall summary of the inventory status (1-2 sentences).
      2. "actions": An array of specific reorder instruction strings (e.g., "Order 500 units of Saline IV immediately").
      
      Return ONLY the JSON.
    `;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }

    const parsedData = JSON.parse(text.trim());
    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Gemini API error in /api/inventory:', error);
    return NextResponse.json({
      predictions: [
        { itemName: 'AI Error', action: 'Perform manual inventory audit', reasoning: 'AI failed to process inventory data.' }
      ]
    }, { status: 500 });
  }
}
