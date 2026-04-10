import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTwilioClient, TWILIO_PHONE_NUMBER } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { customer_card_id } = await req.json();

    if (!customer_card_id) {
      return NextResponse.json({ error: "Missing customer_card_id" }, { status: 400 });
    }

    // Get the customer card with promo details
    // Use the RPC function
    const { data, error } = await supabaseAdmin.rpc("punch_customer_card", { p_customer_card_id: customer_card_id });
    const result = data as any;

    if (error || !result?.success) {
      return NextResponse.json({ error: result?.error || "Failed to punch card" }, { status: 500 });
    }

    // TODO: Send completion SMS — requires storing encrypted phone number
    // or a separate phone lookup table. For now the punch page shows completion
    // prominently on screen. Completion SMS is a follow-on feature.

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Punch error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
