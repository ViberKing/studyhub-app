import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-03-25.dahlia" });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const supabase = getSupabase();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        const billing = session.metadata?.billing || "monthly";
        if (userId && tier) {
          await supabase.from("profiles").update({
            plan: tier,
            billing,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }).eq("id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          const status = subscription.status;
          if (status === "active" || status === "trialing") {
            // Subscription is good — tier already set at checkout
          } else if (status === "past_due" || status === "unpaid") {
            // Keep plan but could show a warning
          } else if (status === "canceled" || status === "incomplete_expired") {
            await supabase.from("profiles").update({ plan: "cancelled" }).eq("id", userId);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await supabase.from("profiles").update({ plan: "cancelled" }).eq("id", userId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Track referral commissions on successful payments
        const paidInvoice = event.data.object as Stripe.Invoice;
        const paidCustomerId = paidInvoice.customer as string;
        const amountPaid = (paidInvoice.amount_paid || 0) / 100; // convert from pence to pounds

        if (amountPaid > 0) {
          // Find the user who paid
          const { data: payer } = await supabase
            .from("profiles")
            .select("id, referred_by")
            .eq("stripe_customer_id", paidCustomerId)
            .single();

          if (payer?.referred_by) {
            // Find the referral record
            const { data: referral } = await supabase
              .from("referrals")
              .select("id, status")
              .eq("referrer_id", payer.referred_by)
              .eq("referee_id", payer.id)
              .single();

            if (referral) {
              // Get partner's commission rate
              const { data: partner } = await supabase
                .from("referral_partners")
                .select("commission_rate, total_earned")
                .eq("user_id", payer.referred_by)
                .single();

              const rate = partner?.commission_rate || 0.50;
              const commission = amountPaid * rate;

              // Log the commission
              await supabase.from("referral_commissions").insert({
                referral_id: referral.id,
                referrer_id: payer.referred_by,
                amount: commission,
                payment_amount: amountPaid,
                stripe_invoice_id: paidInvoice.id,
              });

              // Update total earned
              await supabase
                .from("referral_partners")
                .update({ total_earned: (partner?.total_earned || 0) + commission })
                .eq("user_id", payer.referred_by);

              // Mark referral as active if still pending
              if (referral.status === "pending") {
                await supabase
                  .from("referrals")
                  .update({ status: "active" })
                  .eq("id", referral.id);
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Find user by stripe customer ID and flag
        const { data } = await supabase.from("profiles").select("id").eq("stripe_customer_id", customerId).single();
        if (data) {
          // Could send notification email here in future
        }
        break;
      }
    }
  } catch (err) {
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
