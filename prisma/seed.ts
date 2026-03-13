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
