import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTwilioClient, TWILIO_PHONE_NUMBER } from "@/lib/twilio";
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
    const { phone, promo_token } = await req.json();

    if (!phone || !promo_token) {
      return NextResponse.json({ error: "Missing phone or promo_token" }, { status: 400 });
    }

    // Validate promo exists
    const { data: promo } = await supabase
      .from("promo_templates")
      .select("id, business_id, name")
      .eq("qr_token", promo_token)
      .single();

    if (!promo) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const phoneHash = crypto.createHash("sha256").update(phone).digest("hex");

    // Store verification code (replace any existing for this phone+promo)
    await supabaseAdmin.from("verification_codes").upsert(
      {
        phone_hash: phoneHash,
        promo_id: promo.id,
        business_id: promo.business_id,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
        used: false,
      },
      { onConflict: "phone_hash,promo_id" }
    );

    // Send SMS via Twilio
    const client = getTwilioClient();
    await client.messages.create({
      body: `Your Loyaly verification code: ${code}. Valid for 10 minutes.`,
      from: TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SMS send error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
