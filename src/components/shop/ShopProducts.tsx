import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopCategory } from "@/pages/Shop";
import { useState, useEffect } from "react";
import { fetchProducts, WebshopProduct } from "@/lib/webshopApi";
import { QuickBuyCard } from "@/components/shop/QuickBuyCard";

const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <Skeleton className="h-40 w-full rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  </div>
);

interface ShopProductsProps {
  selectedCategory: ShopCategory;
}

export const ShopProducts = ({ selectedCategory }: ShopProductsProps) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<WebshopProduct[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const productsData = await fetchProducts({ limit: 50 });
        const productsList = Array.isArray(productsData?.products) ? productsData.products : [];
        setProducts(productsList.filter(p => p.is_active !== false));
      } catch (error) {
        console.error("Failed to load shop data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProducts = (() => {
    if (selectedCategory === "all") return products;
    if (selectedCategory === "currency") {
      return products.filter(p => p.item_id < 0);
    }
    return products.filter(p => p.item_id > 0);
  })();

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          ) : filteredProducts.map((product, index) => (
            <QuickBuyCard key={product.id} product={product} index={index} />
          ))}
        </div>

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t('shop.noProducts')}</p>
          </div>
        )}
      </div>
    </section>
  );
};
