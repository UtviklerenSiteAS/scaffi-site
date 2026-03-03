import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("name"),
    name: z.string().min(1, "Navn kan ikke være tomt").max(100),
  }),
  z.object({
    action: z.literal("password"),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Passord må være minst 8 tegn"),
  }),
]);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (parsed.data.action === "name") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    });
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "password") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hashedPassword: true },
    });

    if (!user?.hashedPassword) {
      return NextResponse.json(
        { error: "Ingen passord satt på denne kontoen (Google-innlogging)", code: "NO_PASSWORD" },
        { status: 400 }
      );
    }

    const isValid = await compare(parsed.data.currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Feil nåværende passord", code: "INVALID_PASSWORD" },
        { status: 400 }
      );
    }

    const hashed = await hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword: hashed },
    });
    return NextResponse.json({ success: true });
  }
}

// GDPR: Slett konto og alle tilknyttede data
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  await prisma.$transaction([
    prisma.website.deleteMany({ where: { userId } }),
    prisma.prospect.deleteMany({ where: { userId } }),
    prisma.domain.deleteMany({ where: { userId } }),
    prisma.project.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ success: true });
}
