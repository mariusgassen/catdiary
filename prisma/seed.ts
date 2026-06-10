import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/credentials";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hashPassword("catlover123");

  const demo = await db.user.upsert({
    where: { email: "demo@catdiary.local" },
    update: {},
    create: {
      email: "demo@catdiary.local",
      username: "demo",
      passwordHash,
      displayName: "Demo Cat Lover",
      bio: "Just here for the cats.",
    },
  });

  await db.catEntry.upsert({
    where: { id: "seed-cat-entry-1" },
    update: {},
    create: {
      id: "seed-cat-entry-1",
      ownerId: demo.id,
      photoKey: "seed/placeholder.jpg",
      name: "Whiskers",
      breed: "Tabby",
      notes: "Found napping in a sunny doorway.",
      locationName: "Berlin",
      latitude: 52.52,
      longitude: 13.405,
    },
  });

  console.log(`Seeded demo user ${demo.email} (password: catlover123)`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
