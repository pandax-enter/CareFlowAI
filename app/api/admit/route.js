import { NextResponse } from 'next/server';
import { getHospitalCapacities } from '@/lib/ragParser';
import { savePatientRecord, assignNextAvailableNurse } from '@/lib/firebase';

export async function POST(req) {
  try {
    const { patientInfo, assessment, hospitalName, existingPatientId } = await req.json();

    // 1. Check Capacity
    const capacities = await getHospitalCapacities();
    const hospital = capacities.find(h => h.hospital.toLowerCase().includes(hospitalName.toLowerCase()));

    if (hospital) {
      const dest = assessment.destination; // ICU | Normal Ward
      const util = dest === 'ICU' ? hospital.util_icu : hospital.util_nonicu;

      if (util >= 100) {
        return NextResponse.json({
          success: false,
          error: 'Full Capacity',
          message: `The ${dest} unit at ${hospitalName} is currently at 100% capacity.`
        }, { status: 400 });
      }
    }

    // 2. Assign Nurse
    const nurse = await assignNextAvailableNurse(assessment.requiredSpecialty);

    // 3. Save Patient
    const fullPatientRecord = {
      ...patientInfo,
      riskLevel: assessment.riskLevel,
      urgencyLevel: assessment.urgencyLevel,
      requiredSpecialty: assessment.requiredSpecialty,
      assignedWard: assessment.destination,
      assignedNurseId: nurse.id,
      status: (assessment.destination === 'Emergency' || assessment.destination === 'ICU') ? 'Admitted' : 'Waiting',
      alerts: [assessment.recommendedAction],
      timestamp: new Date().toISOString()
    };

    const patientId = await savePatientRecord(fullPatientRecord, existingPatientId);
    
    // Generate a random Consultation Number (e.g. 1200)
    const consultationNumber = Math.floor(1000 + Math.random() * 9000);

    return NextResponse.json({
      success: true,
      patientId,
      assignedNurse: nurse.name,
      ward: assessment.destination,
      consultationNumber
    });

  } catch (error) {
    console.error('Admission API error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
