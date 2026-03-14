import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Lab
  const lab = await prisma.lab.upsert({
    where: { id: "lab-main" },
    update: {},
    create: {
      id: "lab-main",
      name: "DentalLab Pro",
      address: "123 Lab Street, Medical District",
      phone: "+91 9876543210",
      email: "info@dentallabpro.com",
      currency: "INR",
      taxRate: 18,
    },
  });

  // Create Admin User
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@dentallab.com" },
    update: {},
    create: {
      email: "admin@dentallab.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
      labId: lab.id,
      emailVerified: new Date(),
    },
  });

  // Create Technician User
  const techPassword = await bcrypt.hash("tech123", 12);
  const technician = await prisma.user.upsert({
    where: { email: "tech@dentallab.com" },
    update: {},
    create: {
      email: "tech@dentallab.com",
      password: techPassword,
      name: "Rajesh Kumar",
      role: "TECHNICIAN",
      phone: "+91 9876543211",
      labId: lab.id,
    },
  });

  // Create Reception User
  const recepPassword = await bcrypt.hash("recep123", 12);
  await prisma.user.upsert({
    where: { email: "reception@dentallab.com" },
    update: {},
    create: {
      email: "reception@dentallab.com",
      password: recepPassword,
      name: "Priya Singh",
      role: "RECEPTION",
      phone: "+91 9876543212",
      labId: lab.id,
    },
  });

  // Create Dentists
  const dentist1 = await prisma.dentist.upsert({
    where: { id: "dentist-1" },
    update: {},
    create: {
      id: "dentist-1",
      name: "Dr. Amit Sharma",
      clinicName: "Sharma Dental Clinic",
      phone: "+91 9876543213",
      whatsapp: "+91 9876543213",
      email: "dr.sharma@email.com",
      address: "45 Medical Road, City Center",
      labId: lab.id,
    },
  });

  const dentist2 = await prisma.dentist.upsert({
    where: { id: "dentist-2" },
    update: {},
    create: {
      id: "dentist-2",
      name: "Dr. Neha Patel",
      clinicName: "Patel Orthodontics",
      phone: "+91 9876543214",
      whatsapp: "+91 9876543214",
      email: "dr.neha@email.com",
      address: "78 Health Avenue",
      labId: lab.id,
    },
  });

  const dentist3 = await prisma.dentist.upsert({
    where: { id: "dentist-3" },
    update: {},
    create: {
      id: "dentist-3",
      name: "Dr. Vikram Mehta",
      clinicName: "Mehta Dental Care",
      phone: "+91 9876543215",
      labId: lab.id,
    },
  });

  // Create Patients
  const patient1 = await prisma.patient.upsert({
    where: { id: "patient-1" },
    update: {},
    create: {
      id: "patient-1",
      name: "Ramesh Gupta",
      age: 45,
      gender: "Male",
      phone: "+91 9876543220",
      dentistId: dentist1.id,
      labId: lab.id,
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { id: "patient-2" },
    update: {},
    create: {
      id: "patient-2",
      name: "Sunita Devi",
      age: 38,
      gender: "Female",
      phone: "+91 9876543221",
      dentistId: dentist1.id,
      labId: lab.id,
    },
  });

  const patient3 = await prisma.patient.upsert({
    where: { id: "patient-3" },
    update: {},
    create: {
      id: "patient-3",
      name: "Arjun Reddy",
      age: 55,
      gender: "Male",
      dentistId: dentist2.id,
      labId: lab.id,
    },
  });

  // Create Cases
  const cases = [
    {
      id: "case-1",
      caseNumber: "LAB-20260313-0001",
      dentistId: dentist1.id,
      patientId: patient1.id,
      teethNumbers: [11, 12, 21],
      workType: "Crown",
      shade: "A2",
      material: "Zirconia",
      technicianId: technician.id,
      priority: "HIGH" as const,
      status: "WORKING" as const,
      amount: 4500,
      remarks: "Patient wants natural look",
      labId: lab.id,
    },
    {
      id: "case-2",
      caseNumber: "LAB-20260313-0002",
      dentistId: dentist2.id,
      patientId: patient3.id,
      teethNumbers: [36, 37],
      workType: "Bridge",
      shade: "A3",
      material: "PFM (Porcelain Fused to Metal)",
      technicianId: technician.id,
      priority: "NORMAL" as const,
      status: "RECEIVED" as const,
      amount: 8000,
      labId: lab.id,
    },
    {
      id: "case-3",
      caseNumber: "LAB-20260312-0003",
      dentistId: dentist1.id,
      patientId: patient2.id,
      teethNumbers: [14, 15, 16, 17],
      workType: "Denture - Partial",
      material: "Acrylic",
      technicianId: technician.id,
      priority: "NORMAL" as const,
      status: "TRIAL" as const,
      amount: 6000,
      labId: lab.id,
    },
    {
      id: "case-4",
      caseNumber: "LAB-20260311-0004",
      dentistId: dentist3.id,
      teethNumbers: [21],
      workType: "Veneer",
      shade: "BL2",
      material: "E-Max",
      priority: "URGENT" as const,
      status: "FINISHED" as const,
      amount: 5500,
      labId: lab.id,
    },
    {
      id: "case-5",
      caseNumber: "LAB-20260310-0005",
      dentistId: dentist2.id,
      teethNumbers: [46],
      workType: "Implant Crown",
      shade: "A2",
      material: "Zirconia",
      technicianId: technician.id,
      priority: "NORMAL" as const,
      status: "DELIVERED" as const,
      amount: 7000,
      labId: lab.id,
    },
  ];

  for (const c of cases) {
    await prisma.case.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }

  // Update dentist balances
  await prisma.dentist.update({ where: { id: dentist1.id }, data: { balance: 10500 } });
  await prisma.dentist.update({ where: { id: dentist2.id }, data: { balance: 8000 } });
  await prisma.dentist.update({ where: { id: dentist3.id }, data: { balance: 5500 } });

  // Create Inventory
  const inventoryItems = [
    { id: "inv-1", name: "Zirconia Block", category: "Material", stock: 25, unit: "pcs", costPerUnit: 800, minStock: 5, labId: lab.id },
    { id: "inv-2", name: "E-Max Ingot", category: "Material", stock: 12, unit: "pcs", costPerUnit: 1200, minStock: 5, labId: lab.id },
    { id: "inv-3", name: "PFM Alloy", category: "Material", stock: 3, unit: "gm", costPerUnit: 350, minStock: 10, labId: lab.id },
    { id: "inv-4", name: "Acrylic Teeth Set", category: "Material", stock: 40, unit: "set", costPerUnit: 120, minStock: 10, labId: lab.id },
    { id: "inv-5", name: "Impression Material", category: "Consumable", stock: 8, unit: "box", costPerUnit: 450, minStock: 5, labId: lab.id },
    { id: "inv-6", name: "Diamond Bur Set", category: "Tools", stock: 2, unit: "set", costPerUnit: 600, minStock: 3, labId: lab.id },
    { id: "inv-7", name: "Porcelain Powder", category: "Material", stock: 15, unit: "bottle", costPerUnit: 550, minStock: 5, labId: lab.id },
    { id: "inv-8", name: "Wax Sheet", category: "Consumable", stock: 50, unit: "pcs", costPerUnit: 30, minStock: 20, labId: lab.id },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  // Create sample invoices
  await prisma.invoice.upsert({
    where: { id: "inv-doc-1" },
    update: {},
    create: {
      id: "inv-doc-1",
      invoiceNumber: "INV-202603-0001",
      caseId: "case-5",
      dentistId: dentist2.id,
      amount: 7000,
      discount: 0,
      tax: 0,
      total: 7000,
      status: "PAID",
      labId: lab.id,
    },
  });

  // Create a payment
  await prisma.payment.upsert({
    where: { id: "pay-1" },
    update: {},
    create: {
      id: "pay-1",
      invoiceId: "inv-doc-1",
      dentistId: dentist2.id,
      amount: 7000,
      method: "UPI",
      reference: "UPI-TXN-12345",
    },
  });

  // Create notifications
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { userId: admin.id, title: "New Case Received", message: "Case LAB-20260313-0002 from Dr. Neha Patel", type: "case" },
      { userId: admin.id, title: "Payment Received", message: "Payment of Rs. 7,000 from Dr. Neha Patel via UPI", type: "payment" },
      { userId: admin.id, title: "Low Stock Alert", message: "PFM Alloy stock is below minimum (3/10)", type: "alert" },
      { userId: technician.id, title: "New Case Assigned", message: "Case LAB-20260313-0001 - Crown work assigned to you", type: "case" },
    ],
  });

  // Create Staff Members
  const staffMembers = [
    { id: "staff-1", name: "Ravi Shankar", role: "Technician", phone: "+91 9876543230", salary: 25000, joinedDate: new Date("2024-01-15"), status: "ACTIVE" as const, labId: lab.id },
    { id: "staff-2", name: "Meera Joshi", role: "Receptionist", phone: "+91 9876543231", salary: 18000, joinedDate: new Date("2024-03-01"), status: "ACTIVE" as const, labId: lab.id },
    { id: "staff-3", name: "Suresh Patil", role: "Lab Assistant", phone: "+91 9876543232", salary: 15000, joinedDate: new Date("2024-06-10"), status: "ACTIVE" as const, labId: lab.id },
    { id: "staff-4", name: "Deepa Nair", role: "Doctor", phone: "+91 9876543233", salary: 45000, joinedDate: new Date("2023-11-01"), status: "ACTIVE" as const, labId: lab.id },
  ];

  for (const staff of staffMembers) {
    await prisma.staff.upsert({
      where: { id: staff.id },
      update: {},
      create: staff,
    });
  }

  // Create Appointments
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = [
    { id: "appt-1", patientId: patient1.id, dentistId: dentist1.id, labId: lab.id, date: today, time: "10:00", duration: 30, treatment: "Crown Fitting", status: "CONFIRMED" as const, notes: "Follow-up from last visit" },
    { id: "appt-2", patientId: patient2.id, dentistId: dentist1.id, labId: lab.id, date: today, time: "11:30", duration: 45, treatment: "Root Canal", status: "SCHEDULED" as const },
    { id: "appt-3", patientId: patient3.id, dentistId: dentist2.id, labId: lab.id, date: tomorrow, time: "09:00", duration: 30, treatment: "Orthodontic Check", status: "SCHEDULED" as const },
    { id: "appt-4", patientId: patient1.id, dentistId: dentist1.id, labId: lab.id, date: nextWeek, time: "14:00", duration: 60, treatment: "Implant Consultation", status: "SCHEDULED" as const },
  ];

  for (const appt of appointments) {
    await prisma.appointment.upsert({
      where: { id: appt.id },
      update: {},
      create: appt,
    });
  }

  // Create Pharmacy Items
  const pharmacyItems = [
    { id: "pharm-1", name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "Antibiotics", batchNo: "AMX-2026-001", expiryDate: new Date("2027-06-30"), quantity: 200, mrp: 12, purchasePrice: 8, minStock: 50, supplier: "MediPharma", rackLocation: "A1", labId: lab.id },
    { id: "pharm-2", name: "Ibuprofen 400mg", genericName: "Ibuprofen", category: "Pain Relief", batchNo: "IBU-2026-002", expiryDate: new Date("2027-12-31"), quantity: 150, mrp: 8, purchasePrice: 5, minStock: 30, supplier: "MediPharma", rackLocation: "A2", labId: lab.id },
    { id: "pharm-3", name: "Chlorhexidine Mouthwash", genericName: "Chlorhexidine", category: "Oral Care", batchNo: "CHX-2026-003", expiryDate: new Date("2027-03-15"), quantity: 30, mrp: 120, purchasePrice: 85, minStock: 10, supplier: "DentalSupply Co", rackLocation: "B1", labId: lab.id },
    { id: "pharm-4", name: "Metronidazole 400mg", genericName: "Metronidazole", category: "Antibiotics", batchNo: "MTZ-2026-004", expiryDate: new Date("2027-09-30"), quantity: 100, mrp: 15, purchasePrice: 10, minStock: 25, supplier: "MediPharma", rackLocation: "A1", labId: lab.id },
    { id: "pharm-5", name: "Pantoprazole 40mg", genericName: "Pantoprazole", category: "Gastric", batchNo: "PNT-2026-005", expiryDate: new Date("2026-08-15"), quantity: 8, mrp: 10, purchasePrice: 6, minStock: 20, supplier: "PharmaCo", rackLocation: "C1", labId: lab.id },
  ];

  for (const item of pharmacyItems) {
    await prisma.pharmacyItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  // Create an Orthodontic Plan
  await prisma.orthodonticPlan.upsert({
    where: { id: "ortho-1" },
    update: {},
    create: {
      id: "ortho-1",
      patientId: patient3.id,
      dentistId: dentist2.id,
      diagnosis: "Class II malocclusion with crowding. Recommended full fixed orthodontic treatment.",
      totalCost: 85000,
      startDate: new Date("2026-01-15"),
      status: "ACTIVE",
      notes: "Expected treatment duration: 18-24 months",
      labId: lab.id,
    },
  });

  await prisma.orthoPayment.upsert({
    where: { id: "ortho-pay-1" },
    update: {},
    create: {
      id: "ortho-pay-1",
      planId: "ortho-1",
      date: new Date("2026-01-15"),
      amount: 25000,
      method: "CASH",
      notes: "Initial payment",
    },
  });

  await prisma.orthoPayment.upsert({
    where: { id: "ortho-pay-2" },
    update: {},
    create: {
      id: "ortho-pay-2",
      planId: "ortho-1",
      date: new Date("2026-02-15"),
      amount: 10000,
      method: "UPI",
      notes: "Monthly installment",
    },
  });

  // Create a Prescription
  const prescription = await prisma.prescription.upsert({
    where: { id: "rx-1" },
    update: {},
    create: {
      id: "rx-1",
      patientId: patient1.id,
      dentistId: dentist1.id,
      labId: lab.id,
      date: new Date(),
      notes: "Post-extraction care",
    },
  });

  await prisma.prescriptionItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "rx-item-1", prescriptionId: "rx-1", medicineName: "Amoxicillin 500mg", dosage: "500mg", frequency: "1-0-1", duration: "5 days", instructions: "After meals" },
      { id: "rx-item-2", prescriptionId: "rx-1", medicineName: "Ibuprofen 400mg", dosage: "400mg", frequency: "1-1-1", duration: "3 days", instructions: "After meals, if pain persists" },
      { id: "rx-item-3", prescriptionId: "rx-1", medicineName: "Chlorhexidine Mouthwash", dosage: "15ml", frequency: "0-0-1", duration: "7 days", instructions: "Rinse for 30 seconds, do not swallow" },
    ],
  });

  // Create Medical History
  await prisma.medicalHistory.upsert({
    where: { patientId: patient1.id },
    update: {},
    create: {
      patientId: patient1.id,
      allergies: "Penicillin, Latex",
      conditions: "Hypertension (controlled), Diabetes Type 2",
      bloodGroup: "B+",
      notes: "Patient on regular medication for BP and diabetes. Needs antibiotic prophylaxis before procedures.",
    },
  });

  console.log("Seed completed successfully!");
  console.log("Login credentials:");
  console.log("  Admin: admin@dentallab.com / admin123");
  console.log("  Technician: tech@dentallab.com / tech123");
  console.log("  Reception: reception@dentallab.com / recep123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
