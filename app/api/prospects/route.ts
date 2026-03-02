import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProspectStatus } from "@prisma/client";
import { z } from "zod";

const saveProspectSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const status = req.nextUrl.searchParams.get("status") as ProspectStatus | null;

  try {
    const prospects = await prisma.prospect.findMany({
      where: {
        userId: session.user.id,
        isAutoSaved: false,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        placeId: true,
        name: true,
        address: true,
        phone: true,
        rating: true,
        status: true,
        createdAt: true,
        websites: {
          select: { id: true },
          take: 1,
        },
      },
    });

    return NextResponse.json({ prospects });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch prospects";
    console.error("Prospects fetch error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "FETCH_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const data = saveProspectSchema.parse(body);

    const prospect = await prisma.prospect.upsert({
      where: {
        userId_placeId: {
          userId: session.user.id,
          placeId: data.placeId,
        },
      },
      update: {
        name: data.name,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        rating: data.rating ?? null,
      },
      create: {
        placeId: data.placeId,
        name: data.name,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        rating: data.rating ?? null,
        status: "LEAD",
        isAutoSaved: false,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ prospect });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid prospect data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const errorMessage =
      err instanceof Error ? err.message : "Failed to save prospect";
    console.error("Prospect save error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "SAVE_ERROR" },
      { status: 500 }
    );
  }
}
