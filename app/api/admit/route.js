import { NextResponse } from 'next/server';
import { getHospitalCapacities } from '@/lib/ragParser';
import { savePatientRecord, assignNextAvailableNurse, assignNextAvailableDoctor } from '@/lib/firebase';

export async function POST(req) {
  try {
    const { patientInfo, assessment, hospitalName, existingPatientId } = await req.json();

    // 1. Check Capacity (Allow registration but flag if heavily overloaded)
    const capacities = await getHospitalCapacities();
    const hospital = capacities.find(h => h.hospital.toLowerCase().includes(hospitalName.toLowerCase()));
    
    let isPhysicallyAdmittable = true;
    if (hospital) {
      const dest = assessment.destination; // ICU | Normal Ward
      const util = dest === 'ICU' ? hospital.util_icu : hospital.util_nonicu;
      if (util >= 95) isPhysicallyAdmittable = false;
    }

    // 2. Assign Scope
    const nurse = await assignNextAvailableNurse(assessment.requiredSpecialty);
    const doctor = await assignNextAvailableDoctor(assessment.requiredSpecialty);

    // 3. Save Patient
    const fullPatientRecord = {
      ...patientInfo,
      riskLevel: assessment.riskLevel,
      urgencyLevel: assessment.urgencyLevel,
      requiredSpecialty: assessment.requiredSpecialty,
      assignedWard: assessment.destination,
      assignedNurseId: nurse.id,
      assignedDoctorId: doctor.id,
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
      assignedDoctor: doctor.name,
      ward: assessment.destination,
      consultationNumber,
      isPhysicallyAdmittable
    });

  } catch (error) {
    console.error('Admission API error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
