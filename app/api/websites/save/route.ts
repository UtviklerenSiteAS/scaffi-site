import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWebsiteSchema } from "@/lib/validations/website";
import { checkWebsiteLimit } from "@/lib/subscription";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });

  const canSave = await checkWebsiteLimit(session.user.id, dbUser?.subscriptionTier ?? "FREE", session.user.email);
  if (!canSave) {
    return NextResponse.json(
      { error: "Website limit reached. Upgrade to Pro for unlimited websites.", code: "LIMIT_EXCEEDED" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = saveWebsiteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const prospect = await prisma.prospect.upsert({
      where: {
        userId_placeId: {
          userId: session.user.id,
          placeId: parsed.data.placeId,
        },
      },
      update: {},
      create: {
        placeId: parsed.data.placeId,
        name: parsed.data.businessName,
        address: parsed.data.businessAddress ?? null,
        phone: parsed.data.businessPhone ?? null,
        rating: parsed.data.businessRating ?? null,
        isAutoSaved: false,
        userId: session.user.id,
      },
    });

    const website = await prisma.website.create({
      data: {
        name: `${parsed.data.businessName} Website`,
        htmlContent: parsed.data.htmlContent,
        status: "PLANNING",
        businessName: parsed.data.businessName,
        businessAddress: parsed.data.businessAddress ?? null,
        businessPhone: parsed.data.businessPhone ?? null,
        businessRating: parsed.data.businessRating ?? null,
        businessCategory: parsed.data.businessCategory ?? null,
        businessHours: parsed.data.businessHours ?? null,
        userId: session.user.id,
        prospectId: prospect.id,
      },
    });

    return NextResponse.json({ website });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to save website";
    console.error("Website save error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "SAVE_ERROR" },
      { status: 500 }
    );
  }
}
