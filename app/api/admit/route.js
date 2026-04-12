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
      const dest = assessment.destination; // ICU | Normal Ward | Emergency
      const util = dest === 'ICU' ? hospital.util_icu : hospital.util_nonicu;
      const isCriticalAdmission = assessment.urgencyLevel === 'Critical' || dest === 'Emergency';
      // Critical/Emergency patients are always admitted (emergency departments never turn away critical cases)
      // Only flag capacity issue for standard admissions at 95%+
      if (!isCriticalAdmission && util >= 95) isPhysicallyAdmittable = false;
    }

    // 2. Assign Scope
    const nurse = await assignNextAvailableNurse(assessment.requiredSpecialty);
    const doctor = await assignNextAvailableDoctor(assessment.requiredSpecialty);

    // 3. Save Patient
    const fullPatientRecord = {
      ...patientInfo,
      riskLevel: assessment.riskLevel || 'Medium',
      urgencyLevel: assessment.urgencyLevel || 'Standard',
      requiredSpecialty: assessment.requiredSpecialty || 'General',
      assignedWard: assessment.destination || 'Normal Ward',
      assignedNurseId: nurse.id || null,
      assignedDoctorId: doctor.id || null,
      status: (assessment.destination === 'Emergency' || assessment.destination === 'ICU') ? 'Admitted' : 'Waiting',
      alerts: assessment.recommendedAction ? [assessment.recommendedAction] : [],
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
