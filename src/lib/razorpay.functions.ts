// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Create a Razorpay order on the server. Requires RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET.
 * Returns { rzpOrderId, keyId, amount, currency } for the browser checkout.
 */
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      orderNumber: z.string().min(1).max(64),
      amount: z.number().positive().max(10_000_000), // in INR rupees
      currency: z.string().length(3).default("INR"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay not configured");

    // verify order belongs to caller
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("order_number, user_id, total, payment_status")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.user_id && order.user_id !== context.userId) throw new Error("Forbidden");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    const amountPaise = Math.round(Number(data.amount) * 100);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: data.currency,
        receipt: data.orderNumber,
        notes: { order_number: data.orderNumber },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Razorpay error: ${res.status} ${t}`);
    }
    const rzp = await res.json() as { id: string; amount: number; currency: string };

    await supabaseAdmin.from("payment_transactions").insert({
      order_number: data.orderNumber,
      provider: "razorpay",
      provider_order_id: rzp.id,
      amount: data.amount,
      currency: data.currency,
      status: "created",
      raw: rzp as any,
    });

    return { rzpOrderId: rzp.id, keyId, amount: rzp.amount, currency: rzp.currency };
  });

/**
 * Verify Razorpay payment signature from the browser checkout success callback.
 * If valid, marks order paid.
 */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      orderNumber: z.string().min(1).max(64),
      razorpayOrderId: z.string().min(1).max(128),
      razorpayPaymentId: z.string().min(1).max(128),
      razorpaySignature: z.string().min(1).max(256),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay not configured");

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");

    const ok = expected.length === data.razorpaySignature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(data.razorpaySignature));

    await supabaseAdmin.from("payment_transactions").update({
      provider_payment_id: data.razorpayPaymentId,
      signature: data.razorpaySignature,
      status: ok ? "paid" : "failed",
    }).eq("provider", "razorpay").eq("provider_order_id", data.razorpayOrderId);

    if (!ok) throw new Error("Signature verification failed");

    const { data: ord } = await supabaseAdmin
      .from("orders").select("user_id, payment_status")
      .eq("order_number", data.orderNumber).maybeSingle();
    if (!ord) throw new Error("Order not found");
    if (ord.user_id && ord.user_id !== context.userId) throw new Error("Forbidden");

    await supabaseAdmin.from("orders").update({
      payment_status: "paid",
      order_status: "confirmed",
    }).eq("order_number", data.orderNumber);

    return { ok: true };
  });
