import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "partner";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}${suffix}`;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json({ error: "Missing code or userId" }, { status: 400 });
    }

    // Check if user is already a partner
    const { data: existingPartner } = await supabase
      .from("referral_partners")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingPartner) {
      return NextResponse.json({ error: "You are already a referral partner" }, { status: 400 });
    }

    // Find the access code
    const { data: accessCode } = await supabase
      .from("referral_access_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .is("claimed_by", null)
      .single();

    if (!accessCode) {
      return NextResponse.json({ error: "Invalid or already used access code" }, { status: 400 });
    }

    // Get user's name for slug generation
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    const slug = generateSlug(profile?.name || "partner");

    // Claim the code
    await supabase
      .from("referral_access_codes")
      .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq("id", accessCode.id);

    // Create referral partner
    const { error: partnerError } = await supabase
      .from("referral_partners")
      .insert({
        user_id: userId,
        referral_slug: slug,
        commission_rate: 0.50,
      });

    if (partnerError) {
      return NextResponse.json({ error: "Failed to activate partner account" }, { status: 500 });
    }

    // Mark profile as referral partner
    await supabase
      .from("profiles")
      .update({ is_referral_partner: true })
      .eq("id", userId);

    return NextResponse.json({ success: true, slug });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
