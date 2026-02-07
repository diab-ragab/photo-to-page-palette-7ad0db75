import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Loader2, WifiOff } from "lucide-react";
import { motion } from "framer-motion";

/* ───────── Skeleton Variants ───────── */

interface SkeletonCardProps {
  /** Number of skeleton rows inside the card */
  rows?: number;
  /** Show a skeleton header */
  header?: boolean;
  className?: string;
}

/** Card-shaped skeleton placeholder */
export function SkeletonCard({ rows = 3, header = true, className = "" }: SkeletonCardProps) {
  return (
    <Card className={`bg-card border-primary/20 ${className}`}>
      {header && (
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-36" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}

interface SkeletonGridProps {
  /** Number of skeleton items */
  count?: number;
  /** Tailwind grid classes */
  gridCols?: string;
  /** Height of each skeleton item */
  itemHeight?: string;
  className?: string;
}

/** Grid of skeleton placeholders */
export function SkeletonGrid({
  count = 6,
  gridCols = "grid-cols-2 md:grid-cols-3",
  itemHeight = "h-32",
  className = "",
}: SkeletonGridProps) {
  return (
    <div className={`grid ${gridCols} gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${itemHeight} rounded-xl`} />
      ))}
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

/** List of skeleton rows */
export function SkeletonList({ count = 5, className = "" }: SkeletonListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Inline Spinner ───────── */

interface InlineLoaderProps {
  text?: string;
  className?: string;
}

export function InlineLoader({ text = "Loading...", className = "" }: InlineLoaderProps) {
  return (
    <div className={`flex items-center justify-center gap-2 py-8 text-muted-foreground ${className}`}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/* ───────── Full Page Loader ───────── */

interface PageLoaderProps {
  text?: string;
}

export function PageLoader({ text = "Loading..." }: PageLoaderProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-10 w-10 text-primary" />
      </motion.div>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

/* ───────── Error / Empty States ───────── */

interface ApiErrorStateProps {
  /** Error message to display */
  message?: string;
  /** Callback to retry the failed request */
  onRetry?: () => void;
  /** Show as a full card or inline */
  variant?: "card" | "inline";
  /** Icon override */
  icon?: React.ReactNode;
  className?: string;
}

export function ApiErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
  variant = "inline",
  icon,
  className = "",
}: ApiErrorStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 text-center ${className}`}>
      {icon || <AlertCircle className="h-10 w-10 text-destructive/70" />}
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <Card className="bg-card border-destructive/20">
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return content;
}

interface ApiEmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ApiEmptyState({
  icon,
  title = "No data available",
  description,
  action,
  className = "",
}: ApiEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      {icon && <div className="opacity-40">{icon}</div>}
      <div>
        <p className="font-medium text-muted-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

interface ApiOfflineStateProps {
  onRetry?: () => void;
  className?: string;
}

export function ApiOfflineState({ onRetry, className = "" }: ApiOfflineStateProps) {
  return (
    <ApiErrorState
      message="You appear to be offline. Check your connection."
      onRetry={onRetry}
      icon={<WifiOff className="h-10 w-10 text-muted-foreground/50" />}
      className={className}
    />
  );
}
