import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface ServerStatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
  color?: "blue" | "purple" | "green" | "amber" | "cyan" | "pink";
  formatNumber?: boolean;
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
  },
  pink: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    border: "border-pink-500/20",
  },
};

export function ServerStatsCard({ 
  title, 
  value, 
  icon: Icon, 
  loading = false, 
  color = "blue",
  formatNumber = false 
}: ServerStatsCardProps) {
  const colors = colorMap[color];

  const formatValue = (num: number) => {
    if (!formatNumber) return num.toLocaleString();
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <Card className={`border ${colors.border}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className={`text-lg font-bold ${colors.text}`}>
                {formatValue(value)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
