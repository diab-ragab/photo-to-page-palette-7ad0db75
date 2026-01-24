import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24 md:pt-28">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64 md:w-80" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative p-[1px] rounded-xl bg-gradient-to-br from-muted/50 via-transparent to-muted/50">
              <Card className="bg-card rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vote Section Skeleton */}
          <Card className="lg:col-span-2 bg-card border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[140px] rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            {/* Profile Card Skeleton */}
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>

            {/* Streak Card Skeleton */}
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="text-right space-y-1">
                    <Skeleton className="h-6 w-20 ml-auto" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>

            {/* VIP Progress Skeleton */}
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Game Pass Section Skeleton */}
        <div className="mt-8">
          <Skeleton className="h-8 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Leaderboards Section Skeleton */}
        <div className="mt-8">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
};
