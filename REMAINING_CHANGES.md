# Gjenværende endringer

## Hva er gjort
- ✅ `/dashboard` redirect → `/` (login/proxy.ts fikset)
- ✅ Auth-gate på søk (page.tsx + API-ruter)
- ✅ Stripe installert + Prisma schema oppdatert (SubscriptionTier/Status på User)
- ✅ `types/next-auth.d.ts` — subscriptionTier i session
- ✅ `lib/stripe.ts` — Stripe singleton
- ✅ `lib/subscription.ts` — tier-grenser helper
- ✅ `lib/auth.ts` — subscriptionTier i JWT + session callbacks
- ✅ `app/api/stripe/checkout/route.ts`
- ✅ `app/api/stripe/webhook/route.ts`
- ✅ `app/api/stripe/portal/route.ts`

---

## 1. Subscription-sjekker i API-ruter

### `app/api/websites/generate/route.ts`
Legg til etter `auth`-importen øverst:
```ts
import { prisma } from "@/lib/prisma";
import { checkWebsiteLimit, isPaidTier } from "@/lib/subscription";
```

Legg til etter auth-sjekken (etter linje ~525):
```ts
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { subscriptionTier: true },
});

if (!dbUser || !isPaidTier(dbUser.subscriptionTier)) {
  return new Response(
    JSON.stringify({ error: "Subscription required to generate websites", code: "SUBSCRIPTION_REQUIRED" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

const canGenerate = await checkWebsiteLimit(session.user.id, dbUser.subscriptionTier);
if (!canGenerate) {
  return new Response(
    JSON.stringify({ error: "Website limit reached. Upgrade to Pro for unlimited websites.", code: "LIMIT_EXCEEDED" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
```

### `app/api/websites/save/route.ts`
Samme mønster — legg til auth + subscription-sjekk øverst i POST handler.

---

## 2. Pricing-side — `app/pricing/page.tsx` (NY fil)

Klient-komponent med to kort:

| | Starter | Pro |
|---|---|---|
| Pris | $49/mnd | $199/mnd |
| Søk/mnd | 50 | Ubegrenset |
| Nettsider | 5 | Ubegrenset |
| Deployment | ✅ | ✅ |
| White-label | ❌ | ✅ |

**Logikk:**
- Hent session med `useSession()`
- Hvis ikke innlogget → redirect til `/login?next=/pricing`
- CTA-knapp → POST `/api/stripe/checkout` med `priceId` → redirect til Stripe URL
- Hvis abonnert → vis "Administrer abonnement"-knapp → POST `/api/stripe/portal` → redirect til portal URL
- Vis `session.user.subscriptionTier` som "current plan"

**URL:** Legg til lenke til `/pricing` i `app/page.tsx`-headeren.

---

## 3. Klient-side subscription-sjekker i `app/page.tsx`

### `handleSaveProspect` (rundt linje 248)
Legg til etter session-sjekk:
```ts
if (session.user.subscriptionTier === "FREE") {
  router.push("/pricing");
  return;
}
```

### `handlePitch` (rundt linje 274)
Legg til etter session-sjekk:
```ts
if (session.user.subscriptionTier === "FREE") {
  router.push("/pricing");
  return;
}
```

---

## 4. Env-variabler som må settes

### Lokalt i `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
```

### I Vercel Dashboard (Settings → Environment Variables):
Samme 4 variabler.

---

## 5. Stripe Dashboard oppsett (manuelt)

1. Gå til [dashboard.stripe.com](https://dashboard.stripe.com)
2. Opprett to produkter:
   - **Scaffi Starter** — $49/mnd (recurring) → kopier Price ID
   - **Scaffi Pro** — $199/mnd (recurring) → kopier Price ID
3. Sett `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` og `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
4. Webhook: `Developers → Webhooks → Add endpoint`
   - URL: `https://scaffi.site/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Kopier `Signing secret` → sett som `STRIPE_WEBHOOK_SECRET`

---

## 6. Google OAuth redirect URI (fix for innloggingsfeil)

I [Google Cloud Console](https://console.cloud.google.com):
- APIs & Services → Credentials → din OAuth 2.0 Client
- Authorized redirect URIs → legg til:
  ```
  https://scaffi.site/api/auth/callback/google
  ```
