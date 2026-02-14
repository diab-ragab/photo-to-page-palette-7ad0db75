import { useState, useCallback } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
  FUNDING,
} from "@paypal/react-paypal-js";
import { Loader2, Lock, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPayPalOrder, OrderPayload } from "@/lib/paypalOrderApi";
import { API_BASE, getAuthHeaders } from "@/lib/apiFetch";

interface CardPaymentFormProps {
  /** Order payload describing what is being purchased. When provided, the
   *  unified `createPayPalOrder` utility is used automatically. */
  orderPayload?: OrderPayload;
  /** Legacy: explicit items list (used when orderPayload is not provided) */
  items?: { id: string; name: string; price: number; quantity: number }[];
  characterId?: number;
  characterName?: string;
  isGift?: boolean;
  giftCharacterName?: string;
  totalPrice: number;
  onSuccess: (data: any) => void;
  onError: (message: string) => void;
  /** @deprecated Prefer `orderPayload`. Custom createOrder fallback. */
  createOrderFn?: () => Promise<string>;
}

const PAYPAL_CLIENT_ID = "AWEFJy_edKvt3xKcWnEgeB-lQBtz2VqYGb9eSWnDJB1f7cSyBeZ8R2xoyHF5r_vrnYOxkfkHHrm6EzHs";

export function CardPaymentForm({
  orderPayload,
  items,
  characterId = 0,
  characterName = "",
  isGift = false,
  giftCharacterName = "",
  totalPrice,
  onSuccess,
  onError,
  createOrderFn,
}: CardPaymentFormProps) {
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const createOrder = useCallback(async () => {
    setStatus("processing");
    setErrorMessage("");

    try {
      // 1. Preferred: unified orderPayload
      if (orderPayload) {
        return await createPayPalOrder(orderPayload);
      }

      // 2. Legacy: explicit createOrderFn
      if (createOrderFn) {
        return await createOrderFn();
      }

      // 3. Fallback: build webshop payload from individual props
      return await createPayPalOrder({
        type: "webshop",
        items: (items || []).map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          quantity: i.quantity,
        })),
        characterId,
        characterName,
        isGift,
        giftCharacterName: giftCharacterName.trim(),
      });
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "Failed to create order";
      setErrorMessage(msg);
      onError(msg);
      throw err;
    }
  }, [orderPayload, items, characterId, characterName, isGift, giftCharacterName, onError, createOrderFn]);

  const handleApprove = useCallback(async (data: any) => {
    setStatus("processing");
    try {
      const token = localStorage.getItem("woi_session_token") || "";
      const res = await fetch(`${API_BASE}/paypal_capture.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          paypalOrderId: data.orderID,
          sessionToken: token,
        }),
      });

      const captureData = await res.json();

      if (captureData.success) {
        setStatus("success");
        onSuccess(captureData);
      } else {
        throw new Error(captureData.message || "Payment capture failed");
      }
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "Payment failed";
      setErrorMessage(msg);
      onError(msg);
    }
  }, [onSuccess, onError]);

  const handleError = useCallback((err: Record<string, unknown>) => {
    console.error("PayPal error:", err);
    setStatus("error");
    const msg = "Payment processing failed. Please try again.";
    setErrorMessage(msg);
    onError(msg);
  }, [onError]);

  const handleCancel = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
  }, []);

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-display font-bold mb-2">Payment Successful!</h3>
        <p className="text-sm text-muted-foreground">Your items are being delivered...</p>
      </motion.div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        merchantId: "GNY2CWYMNG7K4",
        components: "buttons",
        currency: "EUR",
        intent: "capture",
        disableFunding: "paylater,venmo,sepa,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sofort",
      }}
    >
      <div className="space-y-4">
        {status === "processing" && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Processing payment...</span>
          </div>
        )}

        {/* Card Payment Button */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pay with Credit / Debit Card
          </p>
          <PayPalButtons
            fundingSource={FUNDING.CARD}
            style={{
              layout: "vertical",
              color: "black",
              shape: "rect",
              label: "pay",
              height: 48,
            }}
            createOrder={createOrder}
            onApprove={handleApprove}
            onError={handleError}
            onCancel={handleCancel}
          />
        </div>

        {/* PayPal Button */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Or pay with PayPal
          </p>
          <PayPalButtons
            fundingSource={FUNDING.PAYPAL}
            style={{
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "pay",
              height: 48,
            }}
            createOrder={createOrder}
            onApprove={handleApprove}
            onError={handleError}
            onCancel={handleCancel}
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {status === "error" && errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="w-3 h-3" />
            <span>PCI Compliant</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by PayPal · No PayPal account required for card payments
        </p>
      </div>
    </PayPalScriptProvider>
  );
}
