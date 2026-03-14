import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to create test data...');

  // Create test users
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codehost.com' },
    update: {},
    create: {
      email: 'admin@codehost.com',
      name: 'Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      passwordHash,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      name: 'Charlie',
      passwordHash,
    },
  });

  console.log('Test user creation complete:', { admin: admin.id, alice: alice.id, bob: bob.id, charlie: charlie.id });
  console.log('Login info:');
  console.log('  admin@codehost.com / password123 (admin)');
  console.log('  alice@example.com / password123');
  console.log('  bob@example.com / password123');
  console.log('  charlie@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
