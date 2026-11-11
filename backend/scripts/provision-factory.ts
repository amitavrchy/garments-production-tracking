import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  const { FACTORY_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!FACTORY_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10)
    throw new Error(
      'Set FACTORY_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters) in the environment',
    );
  await db.$transaction(async (tx) => {
    const factory = await tx.factory.create({ data: { name: FACTORY_NAME } });
    await tx.user.create({
      data: {
        factoryId: factory.id,
        email: ADMIN_EMAIL.toLowerCase(),
        name: 'Factory administrator',
        role: 'FACTORY_ADMIN',
        passwordHash: await hash(ADMIN_PASSWORD, 12),
      },
    });
  });
  console.log(
    'Factory and administrator provisioned. Sign in to configure floors, lines and workers.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
