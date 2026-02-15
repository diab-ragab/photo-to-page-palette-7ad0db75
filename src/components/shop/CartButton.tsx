import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";

export function CartButton() {
  const { items } = useCart();
  const navigate = useNavigate();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => navigate("/cart")}
      aria-label="Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {count}
        </span>
      )}
    </Button>
  );
}
