import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const website = await prisma.website.findFirst({
      where: { id, userId: session.user.id },
      include: {
        prospect: {
          select: {
            id: true,
            placeId: true,
            name: true,
          },
        },
      },
    });

    if (!website) {
      return NextResponse.json(
        { error: "Website not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ website });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch website";
    console.error("Website fetch error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "FETCH_ERROR" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  status: z.enum(["PLANNING", "IN_PROGRESS", "LIVE", "ARCHIVED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { status } = patchSchema.parse(body);

    const website = await prisma.website.updateMany({
      where: { id, userId: session.user.id },
      data: { status },
    });

    if (website.count === 0) {
      return NextResponse.json(
        { error: "Website not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid status value", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const errorMessage =
      err instanceof Error ? err.message : "Failed to update website";
    console.error("Website update error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "UPDATE_ERROR" },
      { status: 500 }
    );
  }
}
