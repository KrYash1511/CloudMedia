import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.conversion.findMany({
    where: { userId, kind: "compress" },
    orderBy: { createdAt: "desc" },
    include: {
      asset: {
        select: {
          id: true,
          publicId: true,
          resourceType: true,
          originalFormat: true,
          bytes: true,
        },
      },
    },
  });

  return NextResponse.json(rows);
}
