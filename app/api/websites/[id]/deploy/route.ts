import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVercelProject, deployStaticSite } from "@/lib/vercel";

export async function POST(
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
    const website = await prisma.website.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!website) {
      return NextResponse.json(
        { error: "Website not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!website.htmlContent) {
      return NextResponse.json(
        { error: "No HTML content to deploy", code: "NO_CONTENT" },
        { status: 400 }
      );
    }

    // Update status to deploying
    await prisma.website.update({
      where: { id },
      data: { deploymentStatus: "DEPLOYING" },
    });

    // Create or reuse Vercel project
    let vercelProjectId = website.vercelProjectId;
    let projectName = "";

    if (!vercelProjectId) {
      const project = await createVercelProject(
        website.businessName ?? website.name
      );
      vercelProjectId = project.id;
      projectName = project.name;
    }

    // Deploy
    const deployment = await deployStaticSite(
      vercelProjectId,
      projectName,
      website.htmlContent
    );

    const deploymentUrl = deployment.url
      ? `https://${deployment.url}`
      : null;

    // Update website with deployment info
    await prisma.website.update({
      where: { id },
      data: {
        vercelProjectId,
        deploymentId: deployment.id,
        deploymentUrl,
        deploymentStatus: "DEPLOYED",
        status: "LIVE",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({
      deploymentId: deployment.id,
      deploymentUrl,
      status: "DEPLOYED",
    });
  } catch (error) {
    // Revert status on failure
    await prisma.website.update({
      where: { id },
      data: { deploymentStatus: "FAILED" },
    }).catch(() => {});

    console.error("Deployment failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Deployment failed",
        code: "DEPLOY_FAILED",
      },
      { status: 500 }
    );
  }
}

// GET deployment status
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

  const website = await prisma.website.findFirst({
    where: { id, userId: session.user.id },
    select: {
      deploymentStatus: true,
      deploymentUrl: true,
      deploymentId: true,
      publishedAt: true,
      customDomain: true,
    },
  });

  if (!website) {
    return NextResponse.json(
      { error: "Website not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json(website);
}
