import { genkit, z } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

// Initialize Genkit with Vertex AI
export const ai = genkit({
  plugins: [
    vertexAI({
      location: 'us-central1', // Change to your preferred region (e.g., asia-southeast1)
    }),
  ],
  model: 'vertexai/gemini-1.5-flash', // Direct model reference
});

/**
 * Clinical Triage Flow
 * Wraps the clinical triage logic into a Genkit flow for tracing and data validation.
 */
export const triageFlow = ai.defineFlow(
  {
    name: 'triageFlow',
    inputSchema: z.object({
      name: z.string().optional(),
      age: z.string().optional(),
      symptoms: z.string().optional(),
      heartRate: z.string().optional(),
      temp: z.string().optional(),
    }),
    outputSchema: z.object({
      riskLevel: z.enum(['Critical', 'Medium', 'Low']),
      urgencyLevel: z.enum(['Critical', 'Urgent', 'Standard']),
      requiredSpecialty: z.string(),
      destination: z.string(),
      recommendedAction: z.string(),
      explanation: z.string(),
    }),
  },
  async (input) => {
    const { name, age, symptoms, heartRate, temp } = input;

    const prompt = `
      You are a clinical triage AI assistant for Malaysia's public healthcare system.
      
      Patient Profile:
      - Name: ${name || 'Unknown'}
      - Age: ${age || 'Unknown'}
      - Symptoms reported: ${symptoms || 'None'}
      - Vitals: Heart Rate ${heartRate || 'Unknown'} bpm, Temperature ${temp || 'Unknown'} °C

      Based on the patient's vitals and symptoms, assess the patient.
      Determine the most appropriate specialty unit (e.g. "Cardiac", "General", "Oncology", "Geriatric", "Pediatric") and the appropriate admission destination ("Emergency", "ICU", or "Normal Ward").

      Return the analysis in a structured format.
    `;

    const response = await ai.generate({
      prompt,
      config: {
        temperature: 0.1,
      },
      output: {
        schema: z.object({
          riskLevel: z.enum(['Critical', 'Medium', 'Low']),
          urgencyLevel: z.enum(['Critical', 'Urgent', 'Standard']),
          requiredSpecialty: z.string(),
          destination: z.string(),
          recommendedAction: z.string(),
          explanation: z.string(),
        }),
      },
    });

    return response.output;
  }
);
