// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const trackOrderPublic = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        orderNumber: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[A-Za-z0-9_-]+$/, "Invalid order number"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select("order_number, order_status, payment_status, shipping_address, created_at, updated_at")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const addr: any = row.shipping_address ?? {};
    // Minimal payload: do NOT expose items, total, customer name, or pincode
    // on the unauthenticated tracking endpoint. City/state are coarse enough
    // for users to confirm they're looking at the right order.
    return {
      order_number: row.order_number,
      order_status: row.order_status,
      payment_status: row.payment_status,
      shipping_address: {
        city: addr.city ?? null,
        state: addr.state ?? null,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
