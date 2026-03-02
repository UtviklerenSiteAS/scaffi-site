const VERCEL_API = "https://api.vercel.com";

function getHeaders(): Record<string, string> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not configured");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function teamParam(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${teamId}` : "";
}

// ─── Types ──────────────────────────────────────────────────────────────────

type VercelProject = {
  id: string;
  name: string;
  accountId: string;
};

type VercelDeployment = {
  id: string;
  url: string;
  readyState: string;
};

// ─── Create project ─────────────────────────────────────────────────────────

export async function createVercelProject(
  name: string
): Promise<VercelProject> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const res = await fetch(`${VERCEL_API}/v11/projects${teamParam()}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: `scaffi-${slug}-${Date.now().toString(36)}`,
      framework: null,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create Vercel project: ${err.error?.message ?? res.statusText}`);
  }

  return res.json();
}

// ─── Deploy static HTML ─────────────────────────────────────────────────────

export async function deployStaticSite(
  projectId: string,
  projectName: string,
  htmlContent: string
): Promise<VercelDeployment> {
  const htmlBase64 = Buffer.from(htmlContent, "utf-8").toString("base64");

  const res = await fetch(`${VERCEL_API}/v13/deployments${teamParam()}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: projectName,
      project: projectId,
      target: "production",
      files: [
        {
          file: "index.html",
          data: htmlBase64,
          encoding: "base64",
        },
      ],
      projectSettings: {
        framework: null,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to deploy: ${err.error?.message ?? res.statusText}`);
  }

  return res.json();
}

// ─── Get deployment status ──────────────────────────────────────────────────

export async function getDeploymentStatus(
  deploymentId: string
): Promise<{ readyState: string; url: string | null }> {
  const res = await fetch(
    `${VERCEL_API}/v13/deployments/${deploymentId}${teamParam()}`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to get deployment status");
  }

  const data = await res.json();
  return {
    readyState: data.readyState,
    url: data.url ? `https://${data.url}` : null,
  };
}

// ─── Add custom domain ─────────────────────────────────────────────────────

export async function addCustomDomain(
  projectId: string,
  domain: string
): Promise<{ name: string; verified: boolean; verificationRecords: Array<{ type: string; name: string; value: string }> }> {
  const res = await fetch(
    `${VERCEL_API}/v10/projects/${projectId}/domains${teamParam()}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name: domain }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to add domain: ${err.error?.message ?? res.statusText}`);
  }

  return res.json();
}

// ─── Get domain config (for DNS records) ────────────────────────────────────

export async function getDomainConfig(
  domain: string
): Promise<{ configuredBy: string | null; misconfigured: boolean; aValues: string[]; cnames: string[] }> {
  const res = await fetch(
    `${VERCEL_API}/v6/domains/${domain}/config${teamParam()}`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to get domain config: ${err.error?.message ?? res.statusText}`);
  }

  return res.json();
}

// ─── Remove project ─────────────────────────────────────────────────────────

export async function removeVercelProject(projectId: string): Promise<void> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${projectId}${teamParam()}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!res.ok && res.status !== 404) {
    throw new Error("Failed to delete Vercel project");
  }
}
