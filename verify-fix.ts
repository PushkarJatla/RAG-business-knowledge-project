
import { prisma } from './src/lib/prisma';

async function main() {
    try {
        console.log("Attempting to connect to Prisma...");
        await prisma.$connect();
        console.log("Successfully connected to Prisma!");
        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Failed to connect to Prisma:", error);
        process.exit(1);
    }
}

main();
