"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Loader2, Zap, Rocket } from "lucide-react";

const STARTER_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "";
const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    priceId: STARTER_PRICE_ID,
    icon: Zap,
    description: "For deg som vil komme i gang med AI-drevet salg.",
    features: [
      "50 prospektsøk per måned",
      "5 AI-genererte nettsider",
      "Deployment til eget domene",
      "Pitch-generator",
      "E-poststøtte",
    ],
    notIncluded: ["White-label", "API-tilgang"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 199,
    priceId: PRO_PRICE_ID,
    icon: Rocket,
    description: "For seriøse byråer som vil skalere uten begrensninger.",
    features: [
      "Ubegrenset prospektsøk",
      "Ubegrenset AI-nettsider",
      "Deployment til eget domene",
      "Pitch-generator",
      "White-label",
      "API-tilgang",
      "Prioritert støtte",
    ],
    notIncluded: [],
    highlighted: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(priceId: string, planId: string) {
    if (status === "unauthenticated") {
      router.push("/login?next=/pricing");
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("manage");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  const currentTier = session?.user?.subscriptionTier ?? "FREE";
  const hasSubscription = currentTier !== "FREE";

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold text-zinc-800 hover:text-zinc-600 transition-colors"
        >
          ← Scaffi
        </button>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-20">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Enkle og transparente priser
          </h1>
          <p className="mt-4 text-lg text-zinc-500">
            Velg planen som passer deg. Ingen bindingstid.
          </p>
        </div>

        {/* Current plan banner */}
        {hasSubscription && (
          <div className="mt-10 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-sm font-medium text-blue-800">
              Du er på <span className="font-bold">{currentTier}</span>-planen.
            </p>
            <button
              onClick={handleManage}
              disabled={loading === "manage"}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading === "manage" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Administrer abonnement
            </button>
          </div>
        )}

        {/* Plans */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentTier === plan.id.toUpperCase();
            const isLoading = loading === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md ${
                  plan.highlighted
                    ? "border-zinc-900 ring-2 ring-zinc-900"
                    : "border-zinc-200"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                    Mest populær
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${plan.highlighted ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900">{plan.name}</h2>
                </div>

                <div className="mt-4">
                  <span className="text-4xl font-bold text-zinc-900">${plan.price}</span>
                  <span className="text-zinc-500">/mnd</span>
                </div>

                <p className="mt-3 text-sm text-zinc-500">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-400 line-through">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() =>
                    isCurrentPlan ? handleManage() : handleSubscribe(plan.priceId, plan.id)
                  }
                  disabled={isLoading || loading === "manage"}
                  className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    plan.highlighted
                      ? "bg-zinc-900 text-white hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  }`}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrentPlan
                    ? "Din nåværende plan"
                    : status === "unauthenticated"
                    ? "Kom i gang"
                    : `Velg ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ note */}
        <p className="mt-12 text-center text-sm text-zinc-400">
          Alle priser er i USD og faktureres månedlig. Kanseller når som helst.
        </p>
      </div>
    </div>
  );
}
