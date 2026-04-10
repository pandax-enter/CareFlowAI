import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Mock result for demo if API key is missing
      return NextResponse.json({
        name: "Ali bin Abu",
        dob: "1985-05-15",
        age: 39,
        success: true
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Clean base64 if it includes the data:image prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      Extract the Full Name and Date of Birth (DOB) from this identification card.
      Return the result EXCLUSIVELY as a JSON object with no markdown:
      {
        "name": "Extracted Full Name",
        "dob": "YYYY-MM-DD",
        "isSuccess": true
      }
      If you cannot read the card, return {"isSuccess": false}.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    let text = response.text().trim();
    
    // Clean markdown if AI included it
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const extraction = JSON.parse(text);

    if (extraction.isSuccess && extraction.dob) {
      // Calculate age
      const birthDate = new Date(extraction.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      extraction.age = age;
    }

    return NextResponse.json({ ...extraction, success: extraction.isSuccess });

  } catch (error) {
    console.error('e-KYC API error:', error);
    return NextResponse.json({ error: 'Failed to extract data from ID', success: false }, { status: 500 });
  }
}
