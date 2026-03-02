import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDomainConfig } from "@/lib/vercel";

export async function GET(
  req: NextRequest,
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
    const domain = await prisma.domain.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if DNS is properly configured via Vercel
    if (domain.status === "DNS_PENDING") {
      try {
        const config = await getDomainConfig(domain.name);

        if (!config.misconfigured) {
          // DNS is configured correctly, update status
          await prisma.domain.update({
            where: { id },
            data: { status: "ACTIVE", dnsConfigured: true },
          });

          return NextResponse.json({
            ...domain,
            status: "ACTIVE",
            dnsConfigured: true,
          });
        }
      } catch {
        // Config check failed, return current status
      }
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error("Domain status check error:", error);
    return NextResponse.json(
      { error: "Failed to check domain status", code: "STATUS_FAILED" },
      { status: 500 }
    );
  }
}
