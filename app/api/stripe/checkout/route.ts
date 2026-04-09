import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId, businessId } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.stripe_subscription_id && business.plan === "pro") {
      return NextResponse.json({ error: "Already subscribed" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const stripe = getStripe();

    let customerId = business.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { supabase_user_id: userId, business_id: businessId },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("businesses")
        .update({ stripe_customer_id: customerId })
        .eq("id", businessId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/dashboard?subscription=cancelled`,
      subscription_data: {
        trial_period_days: 30,
        metadata: { business_id: businessId },
      },
      metadata: { business_id: businessId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
