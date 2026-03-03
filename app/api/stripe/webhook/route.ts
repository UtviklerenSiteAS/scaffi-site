import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json(
      { error: "Invalid signature", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      const tier = mapPriceIdToTier(priceId);

      await prisma.user.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscriptionId,
          subscriptionTier: tier,
          subscriptionStatus: "ACTIVE",
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price.id;
      const tier = mapPriceIdToTier(priceId);

      const status = subscription.status === "active"
        ? "ACTIVE"
        : subscription.status === "past_due"
          ? "PAST_DUE"
          : subscription.cancel_at_period_end
            ? "CANCELED"
            : "INACTIVE";

      await prisma.user.update({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: status,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await prisma.user.update({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionTier: "FREE",
          subscriptionStatus: "INACTIVE",
          stripeSubscriptionId: null,
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await prisma.user.update({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: "PAST_DUE" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function mapPriceIdToTier(priceId: string): "FREE" | "STARTER" | "PRO" {
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return "STARTER";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) return "PRO";
  return "FREE";
}
