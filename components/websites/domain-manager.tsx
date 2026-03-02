"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Globe,
  Loader2,
  Check,
  AlertCircle,
  Search,
  ShoppingCart,
  Link2,
} from "lucide-react";

type DomainManagerProps = {
  websiteId: string;
  vercelProjectId: string | null;
  currentDomain: string | null;
};

type DomainCheck = {
  domain: string;
  available: boolean;
  price: number | null;
  currency: string;
};

export function DomainManager({
  websiteId,
  vercelProjectId,
  currentDomain,
}: DomainManagerProps) {
  const t = useTranslations();
  const [domainInput, setDomainInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<DomainCheck | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedDomain, setConnectedDomain] = useState<string | null>(currentDomain);
  const [showRegistrantForm, setShowRegistrantForm] = useState(false);

  // Registrant form state
  const [registrant, setRegistrant] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "NO",
    phone: "",
    email: "",
  });

  async function handleCheck() {
    if (!domainInput.trim()) return;
    setChecking(true);
    setError(null);
    setCheckResult(null);

    try {
      const res = await fetch(
        `/api/domains/check?domain=${encodeURIComponent(domainInput.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Check failed");
        return;
      }

      setCheckResult(data);
    } catch {
      setError("Network error");
    } finally {
      setChecking(false);
    }
  }

  async function handlePurchase() {
    if (!checkResult?.available) return;
    setPurchasing(true);
    setError(null);

    try {
      const res = await fetch("/api/domains/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: checkResult.domain,
          websiteId,
          registrant,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Purchase failed");
        return;
      }

      // Auto-connect after purchase if website is deployed
      if (vercelProjectId) {
        await handleConnect(data.domain.id);
      }
    } catch {
      setError("Network error");
    } finally {
      setPurchasing(false);
    }
  }

  async function handleConnect(domainId: string) {
    setConnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/domains/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, websiteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Connection failed");
        return;
      }

      setConnectedDomain(data.domain);
    } catch {
      setError("Network error");
    } finally {
      setConnecting(false);
    }
  }

  if (connectedDomain) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">{connectedDomain}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          DNS propagation may take up to 48 hours.
        </p>
      </div>
    );
  }

  if (!vercelProjectId) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-500">
          Deploy the website first before connecting a domain.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Domain search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="example.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={checking || !domainInput.trim()}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          {t("common.search")}
        </button>
      </div>

      {/* Check result */}
      {checkResult && (
        <div
          className={`rounded-xl border p-4 ${
            checkResult.available
              ? "border-emerald-500/30 bg-emerald-950/20"
              : "border-red-500/30 bg-red-950/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                {checkResult.domain}
              </p>
              <p
                className={`text-xs ${
                  checkResult.available ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {checkResult.available ? "Available" : "Not available"}
              </p>
            </div>
            {checkResult.available && checkResult.price && (
              <div className="text-right">
                <p className="text-lg font-bold text-white">
                  ${checkResult.price.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500">{checkResult.currency}/yr</p>
              </div>
            )}
          </div>

          {checkResult.available && !showRegistrantForm && (
            <button
              onClick={() => setShowRegistrantForm(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              <ShoppingCart className="h-4 w-4" />
              Purchase Domain
            </button>
          )}

          {/* Registrant form */}
          {checkResult.available && showRegistrantForm && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={registrant.firstName}
                  onChange={(e) =>
                    setRegistrant({ ...registrant, firstName: e.target.value })
                  }
                  placeholder="First name"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                />
                <input
                  type="text"
                  value={registrant.lastName}
                  onChange={(e) =>
                    setRegistrant({ ...registrant, lastName: e.target.value })
                  }
                  placeholder="Last name"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                />
              </div>
              <input
                type="text"
                value={registrant.address}
                onChange={(e) =>
                  setRegistrant({ ...registrant, address: e.target.value })
                }
                placeholder="Address"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={registrant.city}
                  onChange={(e) =>
                    setRegistrant({ ...registrant, city: e.target.value })
                  }
                  placeholder="City"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                />
                <input
                  type="text"
                  value={registrant.postalCode}
                  onChange={(e) =>
                    setRegistrant({ ...registrant, postalCode: e.target.value })
                  }
                  placeholder="Postal code"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={registrant.phone}
                  onChange={(e) =>
                    setRegistrant({ ...registrant, phone: e.target.value })
                  }
                  placeholder="+47 12345678"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                />
                <input
                  type="email"
                  value={registrant.email}
                  onChange={(e) =>
                    setRegistrant({ ...registrant, email: e.target.value })
                  }
                  placeholder="Email"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                />
              </div>

              <button
                onClick={handlePurchase}
                disabled={
                  purchasing ||
                  !registrant.firstName ||
                  !registrant.lastName ||
                  !registrant.email
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Purchase & Connect
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* Connecting state */}
      {connecting && (
        <div className="flex items-center gap-2 text-sm text-violet-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting domain...
        </div>
      )}
    </div>
  );
}
