import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import Razorpay from "razorpay";

const PACKAGES = [
  { id: "p1", price: 100, credits: 10, bonus: 0 },
  { id: "p2", price: 500, credits: 50, bonus: 0 },
  { id: "p3", price: 1000, credits: 100, bonus: 0 },
  { id: "p4", price: 5000, credits: 500, displayCredits: 515, bonus: 15 },
  { id: "p5", price: 10000, credits: 1000, displayCredits: 1030, bonus: 30 },
];

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate request
    const body = await request.json();
    const { packageId } = body;

    if (!packageId) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
    }

    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    // 3. Check environment variables
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay API keys are missing in environment configuration.");
      return NextResponse.json(
        { error: "Razorpay payment gateway is not configured on the server." },
        { status: 500 }
      );
    }

    // 4. Initialize Razorpay & create order
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const amountInPaise = pkg.price * 100;
    const currency = "INR";
    const creditsToCredit = pkg.displayCredits || pkg.credits;

    console.log(`Creating Razorpay order for user ${user.id}, package ${packageId}, amount ₹${pkg.price}`);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: `receipt_${user.id.substring(0, 8)}_${Date.now()}`,
    });

    // 5. Log the pending transaction in Supabase
    const supabaseAdmin = await createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        razorpay_order_id: order.id,
        amount: amountInPaise,
        currency: currency,
        credits: creditsToCredit,
        status: "pending",
      });

    if (dbError) {
      console.error("Failed to log transaction in database:", dbError);
      // We still return the order, as payment can proceed, but log the warning.
      // This ensures we do not block user payment if the database logging has a non-fatal error.
    } else {
      console.log(`Transaction logged as pending. Order ID: ${order.id}`);
    }

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      credits: creditsToCredit,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
