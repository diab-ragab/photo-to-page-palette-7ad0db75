import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic full-page skeleton used during short auth hydration windows.
 * Keeps the UI from looking like a black/blank screen.
 */
export const AppLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 pt-24 md:pt-28">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-[min(28rem,80%)]" />
            <Skeleton className="h-4 w-[min(22rem,70%)]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 rounded-xl lg:col-span-2" />
            <div className="space-y-6">
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
