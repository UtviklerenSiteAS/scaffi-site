import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { purchaseDomain } from "@/lib/namecheap";
import { purchaseDomainSchema } from "@/lib/validations/domain";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = purchaseDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const { domain, websiteId, registrant } = parsed.data;

  try {
    // Verify website ownership
    const website = await prisma.website.findFirst({
      where: { id: websiteId, userId: session.user.id },
    });

    if (!website) {
      return NextResponse.json(
        { error: "Website not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Purchase the domain
    const result = await purchaseDomain(domain, {
      firstName: registrant.firstName,
      lastName: registrant.lastName,
      address: registrant.address,
      city: registrant.city,
      stateProvince: registrant.stateProvince,
      postalCode: registrant.postalCode,
      country: registrant.country,
      phone: registrant.phone,
      email: registrant.email,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Domain purchase failed", code: "PURCHASE_FAILED" },
        { status: 500 }
      );
    }

    // Create domain record
    const domainRecord = await prisma.domain.create({
      data: {
        name: domain,
        status: "PURCHASED",
        registrarId: result.orderId,
        userId: session.user.id,
        websiteId,
      },
    });

    return NextResponse.json({
      domain: domainRecord,
      orderId: result.orderId,
    });
  } catch (error) {
    console.error("Domain purchase error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Purchase failed",
        code: "PURCHASE_FAILED",
      },
      { status: 500 }
    );
  }
}
