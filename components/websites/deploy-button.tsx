"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Loader2, ExternalLink, Check, AlertCircle } from "lucide-react";

type DeployButtonProps = {
  websiteId: string;
  currentStatus: string;
  currentUrl: string | null;
  onDeployed?: (url: string) => void;
};

export function DeployButton({
  websiteId,
  currentStatus,
  currentUrl,
  onDeployed,
}: DeployButtonProps) {
  const t = useTranslations();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(currentStatus);

  async function handleDeploy() {
    setIsDeploying(true);
    setError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/deploy`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Deployment failed");
        setStatus("FAILED");
        return;
      }

      setDeploymentUrl(data.deploymentUrl);
      setStatus("DEPLOYED");
      onDeployed?.(data.deploymentUrl);
    } catch {
      setError("Network error");
      setStatus("FAILED");
    } finally {
      setIsDeploying(false);
    }
  }

  if (status === "DEPLOYED" && deploymentUrl) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={deploymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Check className="h-4 w-4" />
          {t("common.open")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        {isDeploying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("builder.preview.buildingWebsite")}
          </>
        ) : (
          <>
            <Globe className="h-4 w-4" />
            Publish
          </>
        )}
      </button>
      {error && (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </span>
      )}
    </div>
  );
}
