import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Ensure Prisma Client is generated before creating instance
let prisma: PrismaClient;

try {
  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
} catch (error) {
  console.error("Failed to initialize Prisma Client:", error);
  throw new Error("Prisma Client initialization failed. Make sure to run 'prisma generate' before building.");
}

export { prisma };


