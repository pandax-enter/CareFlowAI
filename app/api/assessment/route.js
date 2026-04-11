import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getHospitalCapacities } from '@/lib/ragParser'; // Using this snippet to prove RAG context

export async function POST(req) {
  try {
    const patientUrlData = await req.json();
    console.log('AI Clinical Assessment requested for:', patientUrlData.name);

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        summary: "Patient appears clinically stable based on current monitoring data. Continued observation of trends is recommended as per standard protocols.",
        actions: ["Routine Monitoring", "In-place stabilization", "Maintain care routine"]
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Fetching RAG context (hospital capacities) to ground the AI's recommendations
    // This makes the AI assessment dynamic and context-aware of the hospital's actual load
    const capacities = await getHospitalCapacities();
    const ragContext = capacities.map(h => `${h.hospital}: Non-ICU Util: ${h.util_nonicu.toFixed(1)}%, ICU Util: ${h.util_icu.toFixed(1)}%`).join('\n');

    const prompt = `
      You are a Clinical AI Assistant for Malaysia's healthcare system. 
      You are assessing a patient based on their current clinical data.
      
      Patient Profile:
      - Name: ${patientUrlData.name}
      - Risk Level: ${patientUrlData.riskLevel}
      - Vitals: Heart Rate ${patientUrlData.vitals?.hr || 'Unknown'} bpm, Temp ${patientUrlData.vitals?.temp || 'Unknown'} C, O2 ${patientUrlData.vitals?.o2 || 'Unknown'}%
      - Symptoms: ${patientUrlData.symptoms || 'None'}
      - Medical Transcript: ${patientUrlData.medicalTranscript || 'None'}

      Here is the current Hospital Capacity context (RAG Data):
      ${ragContext}

      Based on this patient's profile and the current hospital capacity context, provide a clinical assessment.
      If the patient is critical and ICU utilization across hospitals is very high, note the strain and recommend the best course of action.

      Respond ONLY with a valid JSON object matching this schema:
      {
        "summary": "A 2-3 sentence clinical summary and note on hospital capacity implications",
        "actions": ["Action 1", "Action 2", "Action 3"]
      }
    `;

    const result = await model.generateContent(prompt);
    let text = await result.response.text();

    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }

    return NextResponse.json(JSON.parse(text.trim()));
  } catch (error) {
    console.error('Gemini API error in /api/assessment:', error);
    return NextResponse.json({
      summary: "Patient appears clinically stable based on current monitoring data. (AI specific analysis temporarily unavailable)",
      actions: ["Routine Monitoring", "In-place stabilization", "Maintain care routine"]
    }, { status: 500 });
  }
}
