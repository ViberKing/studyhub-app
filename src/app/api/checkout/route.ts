import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
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
    const key = `${tier}_${billing}`;
    const priceId = PRICE_IDS[key];

    if (!priceId) {
      return NextResponse.json({ error: `No price ID for "${key}". Available: ${JSON.stringify(Object.keys(PRICE_IDS).filter(k => PRICE_IDS[k]))}` }, { status: 400 });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
