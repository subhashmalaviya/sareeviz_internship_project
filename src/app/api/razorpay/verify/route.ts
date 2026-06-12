import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import crypto from "crypto";

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

    // 2. Parse request parameters
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment verification details" },
        { status: 400 }
      );
    }

    // 3. Verify Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("Razorpay secret key is missing in environment.");
      return NextResponse.json(
        { error: "Payment verification failed due to server configuration." },
        { status: 500 }
      );
    }

    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const expectedSignature = hmac.digest("hex");

    const isVerified = expectedSignature === razorpay_signature;

    const supabaseAdmin = await createAdminClient();

    if (!isVerified) {
      console.error(`Invalid payment signature for user ${user.id}, order ${razorpay_order_id}`);
      
      // Update transaction status to failed
      await supabaseAdmin
        .from("transactions")
        .update({
          status: "failed",
          razorpay_payment_id,
          razorpay_signature,
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", razorpay_order_id)
        .eq("user_id", user.id);

      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    console.log(`Payment signature verified successfully for order ${razorpay_order_id}`);

    // 4. Retrieve the logged transaction to verify the details and credits amount
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (txError || !transaction) {
      console.error(`Transaction not found in database for order ${razorpay_order_id}:`, txError);
      return NextResponse.json(
        { error: "Transaction record not found. Please contact support." },
        { status: 404 }
      );
    }

    // Security check: ensure transaction belongs to authenticated user
    if (transaction.user_id !== user.id) {
      console.error(`Transaction user mismatch. Tx user: ${transaction.user_id}, Auth user: ${user.id}`);
      return NextResponse.json({ error: "Unauthorized transaction" }, { status: 403 });
    }

    // Idempotency check: if transaction is already marked successful, return success without duplicating credits
    if (transaction.status === "successful") {
      console.log(`Transaction ${razorpay_order_id} was already completed successfully.`);
      return NextResponse.json({ success: true, message: "Payment already processed" });
    }

    // 5. Update transaction details to successful
    const { error: updateTxError } = await supabaseAdmin
      .from("transactions")
      .update({
        status: "successful",
        razorpay_payment_id,
        razorpay_signature,
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id);

    if (updateTxError) {
      console.error(`Failed to update transaction status for ${razorpay_order_id}:`, updateTxError);
      return NextResponse.json(
        { error: "Failed to record payment verification. Please contact support." },
        { status: 500 }
      );
    }

    // 6. Securely update user's credits balance
    // Retrieve current credits
    const { data: currentCredits, error: fetchCreditsError } = await supabaseAdmin
      .from("credits")
      .select("balance, total_purchased")
      .eq("user_id", user.id)
      .single();

    let newBalance = transaction.credits;
    let newPurchased = transaction.credits;

    if (currentCredits) {
      newBalance += currentCredits.balance;
      newPurchased += currentCredits.total_purchased;
    } else {
      // If no credit record exists yet, user gets the purchased credits + 20 free signup credits
      newBalance += 20;
    }

    const { error: updateCreditsError } = await supabaseAdmin
      .from("credits")
      .upsert({
        user_id: user.id,
        balance: newBalance,
        total_purchased: newPurchased,
        updated_at: new Date().toISOString(),
      });

    if (updateCreditsError) {
      console.error(`Failed to credit user balance for ${user.id}:`, updateCreditsError);
      return NextResponse.json(
        { error: "Payment verified but failed to add credits. Please contact support." },
        { status: 500 }
      );
    }

    console.log(`Successfully credited ${transaction.credits} credits to user ${user.id}. New balance: ${newBalance}`);

    return NextResponse.json({
      success: true,
      credits: newBalance,
    });
  } catch (error: any) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
