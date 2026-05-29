// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Initiate a PhonePe Standard Checkout payment.
 * Returns { redirectUrl } that the browser should navigate to.
 *
 * Required env: PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX
 * Optional env: PHONEPE_ENV ("sandbox" | "live", defaults to "sandbox")
 */
export const initiatePhonePe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      orderNumber: z.string().min(1).max(64),
      amount: z.number().positive().max(10_000_000),
      callbackOrigin: z.string().url(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
    const env = (process.env.PHONEPE_ENV || "sandbox").toLowerCase();
    if (!merchantId || !saltKey) throw new Error("PhonePe not configured");

    const { data: order } = await supabaseAdmin
      .from("orders").select("order_number, user_id, payment_status")
      .eq("order_number", data.orderNumber).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.user_id && order.user_id !== context.userId) throw new Error("Forbidden");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    const base = env === "live"
      ? "https://api.phonepe.com/apis/hermes"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox";

    const merchantTxnId = `${data.orderNumber}-${Date.now().toString(36)}`.slice(0, 38);
    const amountPaise = Math.round(Number(data.amount) * 100);
    const payload = {
      merchantId,
      merchantTransactionId: merchantTxnId,
      merchantUserId: context.userId,
      amount: amountPaise,
      redirectUrl: `${data.callbackOrigin}/track-order?order=${data.orderNumber}`,
      redirectMode: "REDIRECT",
      callbackUrl: `${data.callbackOrigin}/api/public/hooks/phonepe`,
      paymentInstrument: { type: "PAY_PAGE" },
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToSign = b64 + "/pg/v1/pay" + saltKey;
    const xVerify = crypto.createHash("sha256").update(stringToSign).digest("hex") + "###" + saltIndex;

    const res = await fetch(`${base}/pg/v1/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "accept": "application/json",
      },
      body: JSON.stringify({ request: b64 }),
    });
    const json = await res.json() as any;
    if (!res.ok || !json?.success) {
      throw new Error(`PhonePe error: ${json?.code || res.status} ${json?.message || ""}`);
    }
    const redirectUrl: string | undefined = json?.data?.instrumentResponse?.redirectInfo?.url;
    if (!redirectUrl) throw new Error("PhonePe redirect URL missing");

    await supabaseAdmin.from("payment_transactions").insert({
      order_number: data.orderNumber,
      provider: "phonepe",
      provider_order_id: merchantTxnId,
      amount: data.amount,
      currency: "INR",
      status: "created",
      raw: json,
    });

    return { redirectUrl, merchantTransactionId: merchantTxnId };
  });
