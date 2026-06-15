const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    const count = await prisma.pass.count();
    console.log(`Total passes in database: ${count}`);
    
    if (count > 0) {
      const latestPasses = await prisma.pass.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { visitor: true }
      });
      console.log('Latest 5 passes:');
      latestPasses.forEach(p => {
        console.log(`- ID: ${p.id}, Number: ${p.passNumber}, Status: ${p.status}, Visitor Email: ${p.visitor.email}`);
      });
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
