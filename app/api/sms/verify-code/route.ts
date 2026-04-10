import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { phone, code, promo_token } = await req.json();

    if (!phone || !code || !promo_token) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const phoneHash = crypto.createHash("sha256").update(phone).digest("hex");

    // Get promo
    const { data: promo } = await supabase
      .from("promo_templates")
      .select("id, business_id, name, punch_count, reward, description, color")
      .eq("qr_token", promo_token)
      .single();

    if (!promo) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check verification code
    const { data: verification } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("phone_hash", phoneHash)
      .eq("promo_id", promo.id)
      .eq("used", false)
      .single();

    if (!verification || verification.code !== code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // Mark code as used
    await supabaseAdmin
      .from("verification_codes")
      .update({ used: true })
      .eq("id", verification.id);

    // Check if customer card already exists
    const { data: existingCard } = await supabase
      .from("customer_cards")
      .select("*")
      .eq("phone_hash", phoneHash)
      .eq("promo_id", promo.id)
      .single();

    if (existingCard) {
      return NextResponse.json({
        success: true,
        customer_card_id: existingCard.id,
        is_new: false,
        customer_card: existingCard,
        promo,
      });
    }

    // Create new customer card
    const { data: customerCard, error: cardError } = await supabaseAdmin
      .from("customer_cards")
      .insert({
        promo_id: promo.id,
        business_id: promo.business_id,
        phone_hash: phoneHash,
        phone_last4: phone.slice(-4),
        punches_remaining: promo.punch_count,
        total_punches: promo.punch_count,
        status: "active",
      })
      .select()
      .single();

    if (cardError || !customerCard) {
      return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      customer_card_id: customerCard.id,
      is_new: true,
      customer_card: customerCard,
      promo,
    });
  } catch (error: any) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
