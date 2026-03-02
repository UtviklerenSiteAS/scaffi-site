import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkDomainAvailability } from "@/lib/namecheap";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain || domain.length < 3) {
    return NextResponse.json(
      { error: "Invalid domain parameter", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  try {
    const result = await checkDomainAvailability(domain);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Domain check failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Domain check failed",
        code: "CHECK_FAILED",
      },
      { status: 500 }
    );
  }
}
