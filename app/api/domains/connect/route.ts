import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addCustomDomain } from "@/lib/vercel";
import { setDnsRecords } from "@/lib/namecheap";
import { connectDomainSchema } from "@/lib/validations/domain";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = connectDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const { domainId, websiteId } = parsed.data;

  try {
    // Verify ownership of domain and website
    const [domain, website] = await Promise.all([
      prisma.domain.findFirst({
        where: { id: domainId, userId: session.user.id },
      }),
      prisma.website.findFirst({
        where: { id: websiteId, userId: session.user.id },
      }),
    ]);

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!website) {
      return NextResponse.json(
        { error: "Website not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!website.vercelProjectId) {
      return NextResponse.json(
        { error: "Website must be deployed to Vercel first", code: "NOT_DEPLOYED" },
        { status: 400 }
      );
    }

    // Add domain to Vercel project
    await addCustomDomain(website.vercelProjectId, domain.name);

    // Set DNS records on Namecheap to point to Vercel
    // Vercel uses CNAME for subdomains and A record for apex domains
    const isApex = domain.name.split(".").length === 2;

    if (isApex) {
      // Apex domain: use A record pointing to Vercel's IP
      await setDnsRecords(domain.name, [
        { type: "A", hostname: "@", address: "76.76.21.21" },
        { type: "CNAME", hostname: "www", address: "cname.vercel-dns.com" },
      ]);
    } else {
      // Subdomain: use CNAME
      const subdomain = domain.name.split(".")[0];
      const parentDomain = domain.name.split(".").slice(1).join(".");
      await setDnsRecords(parentDomain, [
        { type: "CNAME", hostname: subdomain, address: "cname.vercel-dns.com" },
      ]);
    }

    // Update domain status
    await prisma.domain.update({
      where: { id: domainId },
      data: {
        status: "DNS_PENDING",
        websiteId,
      },
    });

    // Update website with custom domain
    await prisma.website.update({
      where: { id: websiteId },
      data: { customDomain: domain.name },
    });

    return NextResponse.json({
      status: "DNS_PENDING",
      domain: domain.name,
      message: "DNS records configured. Propagation may take up to 48 hours.",
    });
  } catch (error) {
    console.error("Domain connect error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to connect domain",
        code: "CONNECT_FAILED",
      },
      { status: 500 }
    );
  }
}
