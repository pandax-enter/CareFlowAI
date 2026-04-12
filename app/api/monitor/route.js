import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req) {
  try {
    const { patient } = await req.json();
    console.log('AI Monitor analysis requested for patient:', patient.id);

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Returning mock monitor response.');
      return NextResponse.json({
        summary: "MOCK: Patient condition is deteriorating over the last 2 hours. High BP sustained.",
        urgent: true
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Parse the trend history to send to the AI
    const historyText = patient.trendHistory 
      ? patient.trendHistory.map(t => `${t.time} - HR: ${t.hr}, Temp: ${t.temp}`).join(' | ') 
      : 'No historical data';

    const prompt = `
      You are a specialized clinical monitoring assistant. 
      Analyze the following patient's vital TRENDS to reduce alarm fatigue. Do not alert on minor single anomalies.
      
      Patient: ${patient.name || 'N/A'}, Age: ${patient.age || 'N/A'}
      Symptoms: ${patient.symptoms || 'N/A'}
      Current Vitals: Heart Rate ${patient.vitals.hr || 'N/A'} BPM, Temperature ${patient.vitals.temp || 'N/A'} °C, BP ${patient.vitals.bp || 'N/A'}
      Recent Vitals Trend: ${historyText}
      
      Group the findings and detect patterns (e.g. "Gradual deterioration over 4 hours", or "Vitals stable, no immediate action required").
      
      Return ONLY a JSON object:
      {
        "summary": "1-2 sentences summarizing the trend and whether action is needed",
        "urgent": boolean (true if the trend indicates worsening condition requiring immediate attention, false otherwise)
      }
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
    console.error('Gemini API error in /api/monitor:', error);
    return NextResponse.json({
      isAbnormal: true,
      alertFlag: 'AI System Error',
      recommendation: 'Perform manual assessment immediately',
      reasoning: 'AI Monitoring failed to process data.'
    }, { status: 500 });
  }
}
