import { motion } from "framer-motion";
import { Shirt, Egg, Coins, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopCategory } from "@/pages/Shop";

interface ShopCategoriesProps {
  selectedCategory: ShopCategory;
  onSelectCategory: (category: ShopCategory) => void;
}

const categories: { id: ShopCategory; icon: typeof Shirt; labelKey: string }[] = [
  { id: "all", icon: LayoutGrid, labelKey: "shop.category.all" },
  { id: "fashion", icon: Shirt, labelKey: "shop.category.fashion" },
  { id: "pets", icon: Egg, labelKey: "shop.category.pets" },
  { id: "currency", icon: Coins, labelKey: "shop.category.currency" },
];

export const ShopCategories = ({ selectedCategory, onSelectCategory }: ShopCategoriesProps) => {
  const { t } = useLanguage();

  return (
    <section className="py-8 border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                onClick={() => onSelectCategory(category.id)}
                className={`gap-2 ${isSelected ? "glow-effect" : ""}`}
              >
                <Icon className="w-4 h-4" />
                {t(category.labelKey as any)}
              </Button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
