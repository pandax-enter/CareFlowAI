export const mockDoctors = [
  { id: 'D001', name: 'Dr. Sarah Lim', specialty: 'Cardiac', hospital: 'Hospital Sultan Ismail Johor Bahru', available: true, availableSlots: ['09:00 AM', '11:00 AM', '02:30 PM'] },
  { id: 'D002', name: 'Dr. Ahmad Faizal', specialty: 'General', hospital: 'Hospital Sultan Ismail Johor Bahru', available: true, availableSlots: ['10:00 AM', '01:00 PM', '04:00 PM'] },
  { id: 'D003', name: 'Dr. Emily Chen', specialty: 'Geriatric', hospital: 'Hospital Kuala Lumpur', available: true, availableSlots: ['08:30 AM', '11:30 AM'] },
  { id: 'D004', name: 'Dr. Raj Kumar', specialty: 'Emergency', hospital: 'Hospital Sultan Ismail Johor Bahru', available: true, availableSlots: ['Immediate'] },
  { id: 'D005', name: 'Dr. Siti Nurhaliza', specialty: 'Emergency', hospital: 'Hospital Sungai Buloh', available: false, availableSlots: [] },
  { id: 'D006', name: 'Dr. Wei Ling', specialty: 'ICU', hospital: 'Hospital Putrajaya', available: true, availableSlots: ['Immediate'] },
  { id: 'D007', name: 'Dr. John Doe', specialty: 'Cardiac', hospital: 'Hospital Kuala Lumpur', available: true, availableSlots: ['10:00 AM'] },
];

export const mockNurses = [
  { id: 'N001', name: 'Nurse Siti Aminah', specialty: 'Cardiac', performanceScore: 92, basePay: 3500, ward: 'Cardiac ICU' },
  { id: 'N002', name: 'Nurse Rajkumar', specialty: 'Cardiac', performanceScore: 88, basePay: 3400, ward: 'Cardiac ICU' },
  { id: 'N003', name: 'Nurse Mei Ling', specialty: 'General', performanceScore: 95, basePay: 3600, ward: 'General Ward 2B' },
  { id: 'N004', name: 'Nurse Hafizah', specialty: 'Geriatric', performanceScore: 85, basePay: 3300, ward: 'Orthopedic / Geriatric' },
  { id: 'N005', name: 'Nurse Kavitha', specialty: 'General', performanceScore: 90, basePay: 3500, ward: 'General Ward 2B' },
];

export const mockPatients = [
  { 
    id: "P001", 
    name: "Ahmad bin Abdullah", 
    age: 65, 
    riskLevel: "High", 
    urgencyLevel: "Critical",
    status: 'Admitted', 
    vitals: { hr: 110, temp: 38.5, bp: '140/90' },
    symptoms: "Severe chest pain, crushing sensation, shortness of breath",
    assignedWard: "Cardiac ICU",
    requiredSpecialty: "Cardiac",
    assignedDoctor: "D001",
    assignedNurseId: "N001",
    alerts: ["Immediate ECG needed", "Possible myocardial infarction"],
    trendHistory: [
      { time: '08:00', hr: 95, temp: 37.2 },
      { time: '09:00', hr: 100, temp: 37.8 },
      { time: '10:00', hr: 108, temp: 38.2 },
      { time: '11:00', hr: 110, temp: 38.5 },
    ],
    careRoutine: ["Administer Aspirin 300mg", "Monitor O2 levels via pulse oximeter", "Prep for angiogram"],
    personalInventory: [
      { item: "Adult Diapers", stock: 12 },
      { item: "Cardiac Meds Supply", stock: 2 }
    ]
  },
  { 
    id: "P002", 
    name: "Sarah Lee", 
    age: 42, 
    riskLevel: "Medium", 
    urgencyLevel: "Urgent",
    status: 'Waiting', 
    vitals: { hr: 88, temp: 37.1, bp: '120/80' },
    symptoms: "Persistent headache, mild blurred vision",
    assignedWard: "General Ward 2B",
    requiredSpecialty: "General",
    assignedDoctor: "D002",
    assignedNurseId: "N003",
    alerts: [],
    trendHistory: [
      { time: '08:00', hr: 85, temp: 36.9 },
      { time: '10:00', hr: 88, temp: 37.1 },
    ],
    careRoutine: ["Check blood pressure every 4 hours", "Give Panadol if headache worsens"],
    personalInventory: [
      { item: "Hygiene Wipes", stock: 15 }
    ]
  },
  { 
    id: "P003", 
    name: "Lim Wei Xin", 
    age: 78, 
    riskLevel: "Low", 
    urgencyLevel: "Standard",
    status: 'Discharged', 
    vitals: { hr: 72, temp: 36.8, bp: '110/70' },
    symptoms: "Recovering from knee replacement",
    assignedWard: "Orthopedic / Geriatric",
    requiredSpecialty: "Geriatric",
    assignedDoctor: "D003",
    assignedNurseId: "N004",
    alerts: [],
    trendHistory: [
      { time: 'Yesterday', hr: 75, temp: 36.9 },
      { time: 'Today', hr: 72, temp: 36.8 },
    ],
    careRoutine: ["Physiotherapy exercises 2x", "Wound dressing change", "Painkiller administration"],
    personalInventory: [
      { item: "Ensure Milk Powder", stock: 1 },
      { item: "Walking Frame", stock: 1 }
    ]
  },
  { 
    id: "P004", 
    name: "Muthu Vellu", 
    age: 55, 
    riskLevel: "High", 
    urgencyLevel: "Urgent",
    status: 'Admitted', 
    vitals: { hr: 92, temp: 37.5, bp: '160/100' },
    symptoms: "Dizziness, numbness in left arm",
    assignedWard: "Cardiac ICU",
    requiredSpecialty: "Cardiac",
    assignedDoctor: "D001",
    assignedNurseId: "N002",
    alerts: ["High BP Monitor"],
    trendHistory: [{ time: '12:00', hr: 90, temp: 37.4 }, { time: '13:00', hr: 92, temp: 37.5 }],
    careRoutine: ["Absolute bed rest", "BP monitor every 30 mins"],
    personalInventory: []
  },
  { 
    id: "P005", 
    name: "Zainab binti Hassan", 
    age: 70, 
    riskLevel: "Low", 
    urgencyLevel: "Standard",
    status: 'Admitted', 
    vitals: { hr: 78, temp: 36.7, bp: '130/80' },
    symptoms: "Post-op observation",
    assignedWard: "General Ward 2B",
    requiredSpecialty: "General",
    assignedDoctor: "D002",
    assignedNurseId: "N005",
    alerts: [],
    trendHistory: [],
    careRoutine: ["Routine observation"],
    personalInventory: []
  }
];

export const mockInventory = [
  {
    id: 'INV001',
    name: 'Paracetamol 500mg',
    stock: 1500,
    unit: 'tablets',
    dailyUsage: 300,
    minThreshold: 500
  },
  {
    id: 'INV002',
    name: 'Oxygen Cylinders',
    stock: 12,
    unit: 'units',
    dailyUsage: 4,
    minThreshold: 10
  },
  {
    id: 'INV003',
    name: 'Saline IV 500ml',
    stock: 80,
    unit: 'bags',
    dailyUsage: 50,
    minThreshold: 100
  }
];
