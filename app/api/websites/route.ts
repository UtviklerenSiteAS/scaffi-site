import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WebsiteStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const statusParam = req.nextUrl.searchParams.get("status") as WebsiteStatus | null;

  try {
    const websites = await prisma.website.findMany({
      where: {
        userId: session.user.id,
        status: statusParam ? statusParam : { not: "ARCHIVED" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        htmlContent: true,
        status: true,
        createdAt: true,
        businessName: true,
        businessAddress: true,
        businessPhone: true,
        businessRating: true,
        businessCategory: true,
        businessHours: true,
        prospect: {
          select: {
            id: true,
            placeId: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ websites });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch websites";
    console.error("Website fetch error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "FETCH_ERROR" },
      { status: 500 }
    );
  }
}
