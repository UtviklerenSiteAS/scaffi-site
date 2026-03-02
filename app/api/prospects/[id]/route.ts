import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["LEAD", "QUALIFIED", "PROPOSAL", "WON", "LOST"]),
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

    const prospect = await prisma.prospect.updateMany({
      where: { id, userId: session.user.id },
      data: { status },
    });

    if (prospect.count === 0) {
      return NextResponse.json(
        { error: "Prospect not found", code: "NOT_FOUND" },
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
      err instanceof Error ? err.message : "Failed to update prospect";
    console.error("Prospect update error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "UPDATE_ERROR" },
      { status: 500 }
    );
  }
}
