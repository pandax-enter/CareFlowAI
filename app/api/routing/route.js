import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getHospitalCapacities } from '@/lib/ragParser';
import { getDoctors } from '@/lib/firebase';

export async function POST(req) {
  let capacities = [];
  let currentHospitalName = 'Hospital Sultan Ismail Johor Bahru';
  
  try {
    const body = await req.json();
    const { triageRisk, currentHospital, requiredSpecialty } = body;
    currentHospitalName = currentHospital || currentHospitalName;
    const requiredDept = requiredSpecialty || 'General';

    // Step 1: Perform RAG lookup on hospital capacities
    capacities = await getHospitalCapacities();
    const doctors = await getDoctors();
    
    // GPS coordinates (lat, lng) for all hospitals in the RAG dataset.
    // Used by Haversine formula to compute exact road-distance approximations.
    const HOSPITAL_COORDS = {
      "Hospital Sultan Ismail Johor Bahru":   [1.482, 103.762],
      "Hospital Sultanah Aminah":             [1.463, 103.759],
      "Hospital Pakar Sultanah Fatimah":      [2.043, 102.573],
      "Hospital Pontian":                     [1.487, 103.390],
      "Hospital Segamat":                     [2.517, 102.826],
      "Hospital Mersing":                     [2.430, 103.836],
      "Hospital Enche' Besar Hajjah Khalsom": [2.026, 103.319],
      "Hospital Sultanah Bahiyah":            [6.121, 100.368],
      "Hospital Sultan Abdul Halim":          [5.644, 100.485],
      "Hospital Kulim":                       [5.377, 100.556],
      "Hospital Jitra":                       [6.264, 100.418],
      "Hospital Sultanah Maliha":             [6.350, 99.803],
      "Hospital Raja Perempuan Zainab II":    [6.130, 102.245],
      "Hospital Pasir Mas":                   [6.045, 102.137],
      "Hospital Tanah Merah":                 [5.800, 102.150],
      "Hospital Tumpat":                      [6.199, 102.175],
      "Hospital Gua Musang":                  [4.882, 101.967],
      "Hospital Melaka":                      [2.192, 102.248],
      "Hospital Alor Gajah":                  [2.386, 102.207],
      "Hospital Jasin":                       [2.304, 102.437],
      "Hospital Tuanku Ja'afar":              [2.730, 101.938],
      "Hospital Tuanku Ampuan Najihah":       [2.737, 102.253],
      "Hospital Rembau":                      [2.590, 102.094],
      "Hospital Tampin":                      [2.476, 102.227],
      "Hospital Tengku Ampuan Afzan":         [3.810, 103.328],
      "Hospital Pekan":                       [3.494, 103.385],
      "Hospital Kuala Lipis":                 [4.184, 102.053],
      "Hospital  Raja Permaisuri Bainun":     [4.590, 101.076],
      "Hospital Taiping":                     [4.854, 100.748],
      "Hospital Teluk Intan":                 [4.024, 101.020],
      "Hospital Seri Manjung":                [4.209, 100.655],
      "Hospital Slim River":                  [3.839, 101.400],
      "Hospital Batu Gajah":                  [4.471, 101.052],
      "Hospital Kuala Kangsar":               [4.774, 100.937],
      "Hospital Gerik":                       [5.422, 101.121],
      "Hospital Kampar":                      [4.304, 101.147],
      "Hospital Tuanku Fauziah":              [6.441, 100.198],
      "Hospital Pulau Pinang":                [5.414, 100.320],
      "Hospital Bukit Mertajam":              [5.365, 100.464],
      "Hospital Sungai Buloh":                [3.207, 101.574],
      "Hospital Selayang":                    [3.255, 101.629],
      "Hospital Ampang":                      [3.151, 101.753],
      "Hospital Kajang":                      [2.993, 101.786],
      "Hospital Shah Alam":                   [3.074, 101.518],
      "Hospital Banting":                     [2.816, 101.503],
      "Hospital Sultanah Nur Zahirah":        [5.336, 103.131],
      "Hospital Kemaman":                     [4.232, 103.419],
      "Hospital Dungun":                      [4.760, 103.417],
      "Hospital Kuala Lumpur":                [3.166, 101.700],
      "Hospital Tunku Azizah":                [3.177, 101.698],
      "Hospital Putrajaya":                   [2.926, 101.696],
      "Hospital Labuan":                      [5.283, 115.240],
      "Hospital Queen Elizabeth":             [5.988, 116.079],
      "Hospital Queen Elizabeth II":          [5.971, 116.068],
      "Hospital Keningau":                    [5.339, 116.163],
      "Hospital Umum Sarawak":                [1.554, 110.422],
      "Hospital Miri":                        [4.400, 113.991],
      "Hospital Sibu":                        [2.293, 111.830],
      "Hospital Bintulu":                     [3.175, 113.039],
      "Hospital Universiti Sains Malaysia":   [6.157, 102.284],
    };

    // State-centroid fallback for any hospital not in HOSPITAL_COORDS
    const STATE_CENTROIDS = {
      "Johor": [1.862, 103.021], "Kedah": [5.785, 100.627],
      "Kelantan": [5.867, 102.240], "Melaka": [2.230, 102.250],
      "Negeri Sembilan": [2.733, 101.938], "Pahang": [3.810, 103.328],
      "Perak": [4.595, 101.048], "Perlis": [6.441, 100.198],
      "Pulau Pinang": [5.360, 100.390], "Sabah": [5.979, 116.073],
      "Sarawak": [1.554, 110.422], "Selangor": [3.073, 101.518],
      "Terengganu": [5.320, 103.130], "W.P. Kuala Lumpur": [3.158, 101.702],
      "W.P. Labuan": [5.283, 115.240], "W.P. Putrajaya": [2.926, 101.696],
    };

    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371, toRad = x => x * Math.PI / 180;
      const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const getCoords = (hospName) => {
      if (HOSPITAL_COORDS[hospName]) return HOSPITAL_COORDS[hospName];
      // Fallback: use state centroid if available from capacities data
      const entry = capacities.find(h => h.hospital === hospName);
      return STATE_CENTROIDS[entry?.state] || [3.158, 101.702]; // default W.P. KL
    };

    // Returns geodesic distance in km from the SELECTED hospital to any other
    const getSimulatedDistance = (toHosp) => {
      if (toHosp === currentHospitalName) return 0;
      const [lat1, lon1] = getCoords(currentHospitalName);
      const [lat2, lon2] = getCoords(toHosp);
      return haversineKm(lat1, lon1, lat2, lon2);
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
      // Using gemini-2.5-flash to ensure compatibility with the updated API Key
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

      // Risk-aware capacity thresholds:
      // Critical/Emergency: only reroute if utilisation >= 95% (hold at HSI unless truly full)
      // Standard/Medium: reroute if > 80%
      const isCritical = triageRisk === 'Critical' || triageRisk === 'Emergency';
      const rerouteThreshold = isCritical ? 95 : 80;

      const prompt = `
        You are a Hospital Flow Optimization AI for Malaysia. 
        A patient needs routing. Their triage risk level is: ${triageRisk}. Required Care Category: ${requiredDept}.
        The patient's SELECTED hospital (where they intend to go) is: ${currentHospitalName}.
        All distances in the dataset below are measured FROM ${currentHospitalName}.

        ROUTING RULES (apply strictly in order):
        1. If risk is Critical or Emergency: only reroute if the selected hospital's utilisation is >= 95%. A critical patient stays at the selected hospital even with 1 slot left.
        2. If risk is Standard or Medium: reroute if the selected hospital's ICU or Non-ICU utilisation exceeds 80%, OR if Sub-Department Staffed is NO.
        3. PROXIMITY IS THE HIGHEST PRIORITY: always recommend the geographically NEAREST hospital with available capacity to ${currentHospitalName}. Do NOT recommend a hospital that is hundreds of km away when one within 50 km has capacity.
        4. Prefer hospitals where Sub-Department Staffed is YES, but ONLY among hospitals that are within a similar distance range (within 50 km). DO NOT skip a hospital that is 10 km away in order to go to one that is 300 km away just because it is staffed.
        5. The reason field MUST include the distance in km to the recommended hospital and the utilisation figures.

        [DATASET CONTEXT: Current Hospital Capacities, Doctors & Distances]
        ${capacityContext}
        [/DATASET CONTEXT]

        Return the recommendation EXCLUSIVELY as a JSON object with NO markdown:
        {
          "isRoutingNeeded": boolean,
          "recommendedHospital": "Exact hospital name from dataset",
          "reason": "Explanation including distance in km, utilisation %, and staff availability"
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
    // Risk-aware thresholds: Critical/Emergency patients stay unless >= 95% full
    const isCriticalFallback = triageRisk === 'Critical' || triageRisk === 'Emergency';
    const utilThreshold = isCriticalFallback ? 95 : 80;

    const currentHosp = capacities.find(h => h.hospital.toLowerCase().includes(currentHospitalName.toLowerCase())) || capacities[0];
    const isHighUtil = currentHosp.util_icu >= utilThreshold || currentHosp.util_nonicu >= utilThreshold;
    
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
        reason: `Capacity is within safe limits at ${currentHosp.hospital} (ICU: ${currentHosp.util_icu}%, Non-ICU: ${currentHosp.util_nonicu}%) and ${requiredDept} physicians are available.`
      });
    }

    // Find best alternative
    const alternatives = capacities
      .filter(h => h.hospital !== currentHosp.hospital)
      .map(h => {
        const dist = getSimulatedDistance(h.hospital);
        const avgUtil = (h.util_icu + h.util_nonicu) / 2;
        // Check staff — no staff adds a large penalty but does NOT eliminate the hospital.
        // This prevents capacities[0] (arbitrary CSV row) from winning when mock data
        // lacks doctors for the required specialty at nearby hospitals.
        const hDocs = doctors.filter(d => d.hospital === h.hospital && d.specialty === requiredDept && d.available !== false);
        const hasStaff = hDocs.length > 0;
        const staffPenalty = hasStaff ? 0 : 30; // small preference for staffed; proximity must dominate
        const score = (dist * 0.7) + (avgUtil * 0.3) + staffPenalty;
        return { ...h, dist, score, hasStaff };
      })
      .sort((a, b) => a.score - b.score);

    const best = alternatives[0] || currentHosp;
    const bestDist = best.dist ?? 0;

    return NextResponse.json({
      isRoutingNeeded: true,
      recommendedHospital: best.hospital,
      reason: `Rerouted from ${currentHospitalName}: selected hospital ${isHighUtil ? `utilisation is high (ICU: ${currentHosp.util_icu}%, Non-ICU: ${currentHosp.util_nonicu}%)` : 'lacks required specialty staff'}. Nearest suitable alternative: ${best.hospital} (${bestDist} km away, ICU: ${best.util_icu}%, Non-ICU: ${best.util_nonicu}%).`
    });

  } catch (error) {
    console.error('Final Routing error:', error);
    return NextResponse.json(
      { isRoutingNeeded: false, recommendedHospital: currentHospitalName, reason: "Bypassed optimization due to system error." },
      { status: 200 } // Return 200 to avoid breaking UI, just use the requested hospital
    );
  }
}
