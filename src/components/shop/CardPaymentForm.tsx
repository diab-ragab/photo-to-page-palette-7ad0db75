import { useState, useRef, useCallback } from "react";
import {
  PayPalScriptProvider,
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { API_BASE, getAuthHeaders } from "@/lib/apiFetch";
import { motion, AnimatePresence } from "framer-motion";

interface CardPaymentFormProps {
  items: { id: string; name: string; price: number; quantity: number }[];
  characterId: number;
  characterName: string;
  isGift: boolean;
  giftCharacterName: string;
  totalPrice: number;
  onSuccess: (data: any) => void;
  onError: (message: string) => void;
}

const PAYPAL_CLIENT_ID = "AWEFJy_edKvt3xKcWnEgeB-lQBtz2VqYGb9eSWnDJB1f7cSyBeZ8R2xoyHF5r_vrnYOxkfkHHrm6EzHs";

const cardFieldStyle = {
  input: {
    "font-size": "14px",
    "font-family": "'Inter', sans-serif",
    color: "#e2e8f0",
    padding: "12px",
  },
  "input:focus": {
    color: "#f8fafc",
  },
  ".invalid": {
    color: "#ef4444",
  },
};

function SubmitButton({ totalPrice, isPaying }: { totalPrice: number; isPaying: boolean }) {
  const { cardFieldsForm } = usePayPalCardFields();

  const handleClick = async () => {
    if (!cardFieldsForm) return;

    cardFieldsForm.submit().catch((err: Error) => {
      console.error("Card submit error:", err);
    });
  };

  return (
    <Button
      onClick={handleClick}
      className="w-full gap-2 h-12 text-base"
      size="lg"
      disabled={isPaying}
    >
      {isPaying ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing Payment...
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" />
          Pay €{totalPrice.toFixed(2)}
        </>
      )}
    </Button>
  );
}

export function CardPaymentForm({
  items,
  characterId,
  characterName,
  isGift,
  giftCharacterName,
  totalPrice,
  onSuccess,
  onError,
}: CardPaymentFormProps) {
  const [isPaying, setIsPaying] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const createOrder = useCallback(async () => {
    setIsPaying(true);
    setStatus("processing");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("woi_session_token") || "";
      const res = await fetch(`${API_BASE}/paypal_create_card_order.php?sessionToken=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            quantity: item.quantity,
          })),
          character_id: isGift ? 0 : characterId,
          character_name: isGift ? "" : characterName,
          is_gift: isGift,
          gift_character_name: isGift ? giftCharacterName.trim() : "",
          sessionToken: token,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.orderID) {
        throw new Error(data.message || "Failed to create order");
      }

      return data.orderID;
    } catch (err: any) {
      setIsPaying(false);
      setStatus("error");
      const msg = err?.message || "Failed to create order";
      setErrorMessage(msg);
      onError(msg);
      throw err;
    }
  }, [items, characterId, characterName, isGift, giftCharacterName, onError]);

  const onApprove = useCallback(async (data: { orderID: string }) => {
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
        setIsPaying(false);
        onSuccess(captureData);
      } else {
        throw new Error(captureData.message || "Payment capture failed");
      }
    } catch (err: any) {
      setIsPaying(false);
      setStatus("error");
      const msg = err?.message || "Payment failed";
      setErrorMessage(msg);
      onError(msg);
    }
  }, [onSuccess, onError]);

  const onErrorCallback = useCallback((err: Record<string, unknown>) => {
    console.error("PayPal card error:", err);
    setIsPaying(false);
    setStatus("error");
    const msg = "Payment processing failed. Please try again.";
    setErrorMessage(msg);
    onError(msg);
  }, [onError]);

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
        components: "card-fields",
        currency: "EUR",
        intent: "capture",
      }}
    >
      <PayPalCardFieldsProvider
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onErrorCallback}
        style={cardFieldStyle}
      >
        <div className="space-y-4">
          {/* Card Holder Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Card Holder Name
            </label>
            <div className="rounded-lg border border-input bg-background overflow-hidden paypal-card-field-wrapper">
              <PayPalNameField
                style={cardFieldStyle}
                className="paypal-card-field"
              />
            </div>
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Card Number
            </label>
            <div className="rounded-lg border border-input bg-background overflow-hidden paypal-card-field-wrapper">
              <PayPalNumberField
                style={cardFieldStyle}
                className="paypal-card-field"
              />
            </div>
          </div>

          {/* Expiry + CVV Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Expiry Date
              </label>
              <div className="rounded-lg border border-input bg-background overflow-hidden paypal-card-field-wrapper">
                <PayPalExpiryField
                  style={cardFieldStyle}
                  className="paypal-card-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                CVV
              </label>
              <div className="rounded-lg border border-input bg-background overflow-hidden paypal-card-field-wrapper">
                <PayPalCVVField
                  style={cardFieldStyle}
                  className="paypal-card-field"
                />
              </div>
            </div>
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

          {/* Submit */}
          <SubmitButton totalPrice={totalPrice} isPaying={isPaying} />

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
            Powered by PayPal · 3D Secure enabled
          </p>
        </div>
      </PayPalCardFieldsProvider>
    </PayPalScriptProvider>
  );
}
