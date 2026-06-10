import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Super Admin
  const adminEmail = 'admin@university.edu';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('AdminPassword@123', 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+11234567890',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        universityId: 'ADMIN001',
      },
    });
    console.log(`✅ Super Admin created: ${superAdmin.email}`);
  } else {
    console.log(`ℹ️ Super Admin user (${adminEmail}) already exists. Skipping.`);
  }

  // 2. Hostel Warden
  const wardenEmail = 'warden@university.edu';
  const existingWarden = await prisma.user.findUnique({
    where: { email: wardenEmail },
  });

  if (!existingWarden) {
    const passwordHash = await bcrypt.hash('WardenPassword@123', 10);
    const warden = await prisma.user.create({
      data: {
        email: wardenEmail,
        passwordHash,
        firstName: 'Ramesh',
        lastName: 'Kumar',
        phone: '+919876543211',
        role: UserRole.HOSTEL_WARDEN,
        isActive: true,
        universityId: 'WARDEN001',
      },
    });
    console.log(`✅ Hostel Warden created: ${warden.email}`);
  } else {
    console.log(`ℹ️ Hostel Warden user (${wardenEmail}) already exists. Skipping.`);
  }

  // 3. Security Guard
  const guardEmail = 'guard@university.edu';
  const existingGuard = await prisma.user.findUnique({
    where: { email: guardEmail },
  });

  if (!existingGuard) {
    const passwordHash = await bcrypt.hash('GuardPassword@123', 10);
    const guard = await prisma.user.create({
      data: {
        email: guardEmail,
        passwordHash,
        firstName: 'Satish',
        lastName: 'Singh',
        phone: '+919876543212',
        role: UserRole.SECURITY_GUARD,
        isActive: true,
        universityId: 'GUARD001',
      },
    });
    console.log(`✅ Security Guard created: ${guard.email}`);
  } else {
    console.log(`ℹ️ Security Guard user (${guardEmail}) already exists. Skipping.`);
  }

  // 4. Student (Can only request passes, cannot approve)
  const studentEmail = 'student@university.edu';
  const existingStudent = await prisma.user.findUnique({
    where: { email: studentEmail },
  });

  if (!existingStudent) {
    const passwordHash = await bcrypt.hash('StudentPassword@123', 10);
    const student = await prisma.user.create({
      data: {
        email: studentEmail,
        passwordHash,
        firstName: 'Amit',
        lastName: 'Sharma',
        phone: '+919876543213',
        role: UserRole.STUDENT,
        isActive: true,
        universityId: 'STUDENT001',
      },
    });
    console.log(`✅ Student created: ${student.email}`);
  } else {
    console.log(`ℹ️ Student user (${studentEmail}) already exists. Skipping.`);
  }

  // 5. Faculty (Can request and also approve passes)
  const facultyEmail = 'faculty@university.edu';
  const existingFaculty = await prisma.user.findUnique({
    where: { email: facultyEmail },
  });

  if (!existingFaculty) {
    const passwordHash = await bcrypt.hash('FacultyPassword@123', 10);
    const faculty = await prisma.user.create({
      data: {
        email: facultyEmail,
        passwordHash,
        firstName: 'Sunita',
        lastName: 'Patel',
        phone: '+919876543214',
        role: UserRole.FACULTY,
        isActive: true,
        universityId: 'FACULTY001',
      },
    });
    console.log(`✅ Faculty created: ${faculty.email}`);
  } else {
    console.log(`ℹ️ Faculty user (${facultyEmail}) already exists. Skipping.`);
  }

  // 6. Security Admin
  const secAdminEmail = 'secadmin@university.edu';
  const existingSecAdmin = await prisma.user.findUnique({
    where: { email: secAdminEmail },
  });

  if (!existingSecAdmin) {
    const passwordHash = await bcrypt.hash('SecAdminPassword@123', 10);
    const secAdmin = await prisma.user.create({
      data: {
        email: secAdminEmail,
        passwordHash,
        firstName: 'Vikram',
        lastName: 'Singh',
        phone: '+919876543215',
        role: UserRole.SECURITY_ADMIN,
        isActive: true,
        universityId: 'SECADMIN001',
      },
    });
    console.log(`✅ Security Admin created: ${secAdmin.email}`);
  } else {
    console.log(`ℹ️ Security Admin user (${secAdminEmail}) already exists. Skipping.`);
  }

  console.log('🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
