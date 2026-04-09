import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-03-25.dahlia" });
}

const PRICE_IDS: Record<string, string | undefined> = {
  "essential_monthly": process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY,
  "essential_annual": process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL,
  "plus_monthly": process.env.STRIPE_PRICE_PLUS_MONTHLY,
  "plus_annual": process.env.STRIPE_PRICE_PLUS_ANNUAL,
  "pro_monthly": process.env.STRIPE_PRICE_PRO_MONTHLY,
  "pro_annual": process.env.STRIPE_PRICE_PRO_ANNUAL,
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { tier, billing, userId, email } = await req.json();
    const priceId = PRICE_IDS[`${tier}_${billing}`];

    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan — Stripe price IDs not configured yet" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId, tier },
      },
      metadata: { userId, tier, billing },
      success_url: `${req.nextUrl.origin}/dashboard?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
