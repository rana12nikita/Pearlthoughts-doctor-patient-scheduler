import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1️⃣ Create User for Doctor
  const userDoctor = await prisma.user.create({
    data: {
      email: "doctor@example.com",
      password: "hashedpassword123", 
      name: "Dr. Smith",
      role: "DOCTOR"
    }
  });

  // 2️⃣ Create Doctor Profile
  const doctor = await prisma.doctor.create({
    data: {
      userId: userDoctor.id,
      specialization: "Cardiology",
      schedule_Type: "stream",
      slot_duration_min: 30,
    }
  });

  // 3️⃣ Create User for Patient
  const userPatient = await prisma.user.create({
    data: {
      email: "patient@example.com",
      password: "hashedpassword123",
      name: "Nikita",
      role: "PATIENT"
    }
  });

  // 4️⃣ Create Patient Profile
  const patient = await prisma.patient.create({
    data: {
      userId: userPatient.id
    }
  });

  // 5️⃣ Add Doctor Availability
  await prisma.doctorAvailability.create({
    data: {
      doctorId: doctor.id,
      date: new Date("2025-06-25"),
      session_start: new Date("2025-06-25T10:00:00.000Z"),
      session_end: new Date("2025-06-25T12:00:00.000Z"),
      slot_duration_min: 30,
      patients_per_slot: 3
    }
  });

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

