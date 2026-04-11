import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getHospitalCapacities } from '@/lib/ragParser';
import { getDoctors } from '@/lib/firebase';

export async function POST(req) {
  let capacities = [];
  let currentHospitalName = 'Hospital Kuala Lumpur';
  
  try {
    const body = await req.json();
    const { triageRisk, currentHospital, requiredSpecialty } = body;
    currentHospitalName = currentHospital || currentHospitalName;
    const requiredDept = requiredSpecialty || 'General';

    // Step 1: Perform RAG lookup on hospital capacities
    capacities = await getHospitalCapacities();
    const doctors = await getDoctors();
    
    // Geographical helper
    const getSimulatedDistance = (hosp) => {
       const distances = {
           "Hospital Kuala Lumpur": 0,
           "Hospital Ampang": 8.5,
           "Hospital Sungai Buloh": 22.0,
           "Hospital Putrajaya": 35.0,
           "Hospital Sultan Ismail Johor Bahru": 330.0,
           "Hospital Sultanah Aminah": 335.0,
       };
       return distances[hosp] !== undefined ? distances[hosp] : Math.floor(Math.random() * 50) + 5; 
    };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Prepare the capacity & doctor context
    const capacityContext = capacities.map(h => {
      // Find if this hospital has available doctors for the needed specialty
      const availableDocs = doctors.filter(d => 
        d.hospital === h.hospital && 
        d.specialty === requiredDept && 
        d.available !== false
      );
      const isStaffed = availableDocs.length > 0;
      
      return `${h.hospital} (${h.state}): Non-ICU Util: ${h.util_nonicu.toFixed(1)}%, ICU Util: ${h.util_icu.toFixed(1)}% | Sub-Department Staffed: ${isStaffed ? 'YES' : 'NO'} | Simulated Distance: ${currentHospitalName === h.hospital ? '0' : getSimulatedDistance(h.hospital)} km away`;
    }).join('\n');

    if (process.env.GEMINI_API_KEY) {
      // To change the model later, update the string below (e.g., "gemini-2.0-flash")
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
        You are a Hospital Flow Optimization AI for Malaysia. 
        A patient needs routing. Their triage risk level is: ${triageRisk}. Required Care Category: ${requiredDept}.
        They were originally considering going to ${currentHospitalName}.

        [DATASET CONTEXT: Current Hospital Capacities, Doctors & Distances]
        ${capacityContext}
        [/DATASET CONTEXT]

        Analyze the dataset context. If the originally considered hospital has an ICU utilization or Non-ICU utilization over 80% OR if Sub-Department Staffed is NO, recommend the best alternative hospital.
        CRITICAL: You must mathematically weigh Distance against Capacity AND YOU MUST NEVER route a patient to a hospital where their Sub-Department Staffed is NO. Ensure the chosen facility has safe utilization (preferably under 75%). 

        Return the recommendation EXCLUSIVELY as a JSON object with NO markdown:
        {
          "isRoutingNeeded": boolean,
          "recommendedHospital": "Name of best hospital",
          "reason": "Brief explanation with numbers including distance and staff availability"
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Clean markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiAnalysis = JSON.parse(text);
        return NextResponse.json(aiAnalysis);
      } catch (aiErr) {
        console.error("AI Routing Error, falling back to Math:", aiErr.message);
        // Fall through to mathematical logic
      }
    }

    // --- MATHEMATICAL FALLBACK LOGIC ---
    // If AI fails or API key is missing, we use a scoring algorithm
    const currentHosp = capacities.find(h => h.hospital.toLowerCase().includes(currentHospitalName.toLowerCase())) || capacities[0];
    const isHighUtil = currentHosp.util_icu > 80 || currentHosp.util_nonicu > 80;
    
    // Check local staffing
    const localDocs = doctors.filter(d => 
      d.hospital === currentHosp.hospital && 
      d.specialty === requiredDept && 
      d.available !== false
    );
    const hasLocalStaff = localDocs.length > 0;

    if (!isHighUtil && hasLocalStaff) {
      return NextResponse.json({
        isRoutingNeeded: false,
        recommendedHospital: currentHosp.hospital,
        reason: `Capacity status is safe at ${currentHosp.hospital} (ICU: ${currentHosp.util_icu}%, Non-ICU: ${currentHosp.util_nonicu}%) and ${requiredDept} physicians are available.`
      });
    }

    // Find best alternative
    const alternatives = capacities
      .filter(h => h.hospital !== currentHosp.hospital)
      .map(h => {
        const dist = getSimulatedDistance(h.hospital);
        const avgUtil = (h.util_icu + h.util_nonicu) / 2;
        // Check staff
        const hDocs = doctors.filter(d => d.hospital === h.hospital && d.specialty === requiredDept && d.available !== false);
        const hasStaff = hDocs.length > 0;
        
        // Scoring: Lower is better. Distance has 70% weight, Avg Utilization has 30% weight. Penalty if no staff.
        const score = (dist * 0.7) + (avgUtil * 0.3) + (hasStaff ? 0 : 9999);
        return { ...h, dist, score, hasStaff };
      })
      .filter(h => h.hasStaff) // Only consider hospitals with matching staff
      .sort((a, b) => a.score - b.score);

    const best = alternatives[0] || capacities[0];

    return NextResponse.json({
      isRoutingNeeded: true,
      recommendedHospital: best.hospital,
      reason: `FALLBACK: Primary hospital is over utilized. Routed to ${best.hospital} (${best.dist}km away) due to available ${requiredDept} specialists and balanced capacity.`
    });

  } catch (error) {
    console.error('Final Routing error:', error);
    return NextResponse.json(
      { isRoutingNeeded: false, recommendedHospital: currentHospitalName, reason: "Bypassed optimization due to system error." },
      { status: 200 } // Return 200 to avoid breaking UI, just use the requested hospital
    );
  }
}
