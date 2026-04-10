import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { name, age, symptoms, heartRate, temp } = await req.json();
    console.log('AI Triage Request received for:', name);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Returning mock triage response.');
      return NextResponse.json({
        riskLevel: 'Medium',
        urgencyLevel: 'Urgent',
        requiredSpecialty: 'General',
        destination: 'Normal Ward',
        recommendedAction: 'Visit nearest clinic for evaluation',
        explanation: 'GEMINI_API_KEY is not set in environment variables. Simulated response.'
      });
    }

    // To change the model later, update the string below (e.g., "gemini-2.0-flash")
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a clinical triage AI assistant for Malaysia's public healthcare system.
      
      Patient Profile:
      - Name: ${name || 'Unknown'}
      - Age: ${age || 'Unknown'}
      - Symptoms reported: ${symptoms || 'None'}
      - Vitals: Heart Rate ${heartRate || 'Unknown'} bpm, Temperature ${temp || 'Unknown'} °C

      Based on the dataset context and the patient's vitals, completely assess the patient.
      Determine the most appropriate specialty unit (e.g. "Cardiac", "General", "Oncology", "Geriatric", "Pediatric") and the appropriate admission destination ("Emergency", "ICU", or "Normal Ward").

      Return the assessment EXCLUSIVELY as a JSON object with NO markdown formatting, NO backticks, and NO extra text:
      {
        "riskLevel": "Critical" | "Medium" | "Low",
        "urgencyLevel": "Critical" | "Urgent" | "Standard",
        "requiredSpecialty": "Name of specialty dept",
        "destination": "Emergency | ICU | Normal Ward",
        "recommendedAction": "Short, clear instruction for the triage nurse",
        "explanation": "Brief reasoning referencing the vitals, symptoms, and dataset matches if relevant."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean JSON if needed (sometimes Gemini wraps in ```json)
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }

    const parsedData = JSON.parse(text.trim());
    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Gemini API error in /api/triage:', error);
    return NextResponse.json({
      riskLevel: 'critical',
      recommendedAction: 'Seek medical attention immediately',
      explanation: 'An error occurred during AI analysis. Please proceed with standard clinical judgment.'
    }, { status: 500 });
  }
}
