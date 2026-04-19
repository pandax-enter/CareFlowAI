import { NextResponse } from 'next/server';
import { triageFlow } from '@/lib/genkit';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('AI Triage Request (Genkit) received for:', body.name);

    // Run the Genkit flow
    // In production, this uses Vertex AI via IAM roles; locally it uses ADC
    const assessment = await triageFlow(body);

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Genkit/Vertex AI error in /api/triage:', error);
    return NextResponse.json({
      riskLevel: 'Critical',
      urgencyLevel: 'Emergency',
      requiredSpecialty: 'General Medicine',
      destination: 'Emergency',
      recommendedAction: 'Seek medical attention immediately - SYSTEM FALLBACK',
      explanation: 'An error occurred during AI analysis. Please proceed with standard clinical judgment.'
    }, { status: 200 });
  }
}
