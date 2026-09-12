require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcrypt');
const { PrismaClient: IdentityPrisma } = require('./prisma/generated/client');
const { PrismaClient: BusinessPrisma } = require('../business-service/prisma/generated/client');

const identityPrisma = new IdentityPrisma();
const businessPrisma = new BusinessPrisma();

async function main() {
  const password = 'User123!';
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);

  const accounts = [
    { email: 'adminhuki@gmail.com', fullName: 'HuKi Super Admin', role: 'PLATFORM_ADMIN' },
    { email: 'user@huki.com', fullName: 'HuKi User', role: 'USER' },
    { email: 'business@huki.com', fullName: 'HuKi Business / Seller', role: 'BUSINESS' },
  ];

  console.log(`Setting up demo accounts with password: "${password}"...`);

  for (const acc of accounts) {
    const user = await identityPrisma.user.upsert({
      where: { email: acc.email },
      update: {
        passwordHash: hash,
        role: acc.role,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
        emailVerifiedAt: new Date(),
        fullName: acc.fullName,
      },
      create: {
        email: acc.email,
        passwordHash: hash,
        fullName: acc.fullName,
        role: acc.role,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`✓ User synced: ${user.email} (ID: ${user.id}, Role: ${user.role}, Status: ${user.status})`);
  }

  // Ensure business entity in business_db is assigned to business@huki.com
  const businessUser = await identityPrisma.user.findUnique({ where: { email: 'business@huki.com' } });
  if (businessUser) {
    const existingBiz = await businessPrisma.business.findFirst({
      where: { email: 'business@huki.com' }
    });

    let bizId;
    if (existingBiz) {
      await businessPrisma.business.update({
        where: { id: existingBiz.id },
        data: {
          ownerId: businessUser.id,
          status: 'APPROVED',
          name: 'HuKi Official Store'
        }
      });
      bizId = existingBiz.id;
      console.log(`✓ Business updated for owner ${businessUser.email} (Biz ID: ${bizId})`);
    } else {
      const newBiz = await businessPrisma.business.create({
        data: {
          name: 'HuKi Official Store',
          email: 'business@huki.com',
          phone: '0987654321',
          address: 'Ho Chi Minh City, Vietnam',
          taxCode: '0123456789',
          businessType: 'INDIVIDUAL',
          status: 'APPROVED',
          ownerId: businessUser.id,
        }
      });
      bizId = newBiz.id;
      console.log(`✓ Created Business for owner ${businessUser.email} (Biz ID: ${bizId})`);
    }

    // Ensure store exists
    const existingStore = await businessPrisma.store.findFirst({
      where: { businessId: bizId }
    });
    if (!existingStore) {
      await businessPrisma.store.create({
        data: {
          businessId: bizId,
          name: 'HuKi Bookstore',
          slug: 'huki-bookstore',
          description: 'Official bookstore of HuKi Platform',
          email: 'business@huki.com',
          status: 'APPROVED',
          isActive: true
        }
      });
      console.log(`✓ Created Store for Business ID: ${bizId}`);
    }

    // Ensure Member record exists
    await businessPrisma.member.upsert({
      where: {
        businessId_userId: {
          businessId: bizId,
          userId: businessUser.id,
        }
      },
      update: {
        role: 'OWNER',
        status: 'ACTIVE',
      },
      create: {
        businessId: bizId,
        userId: businessUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      }
    });
    console.log(`✓ Member record set as OWNER for business user ${businessUser.email}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await identityPrisma.$disconnect();
    await businessPrisma.$disconnect();
  });
