import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export const CartButton = () => {
  const { totalItems } = useCart();

  return (
    <Link to="/cart">
      <Button variant="outline" size="icon" className="relative">
        <ShoppingCart className="w-5 h-5" />
        {totalItems > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
            {totalItems}
          </Badge>
        )}
      </Button>
    </Link>
  );
};
