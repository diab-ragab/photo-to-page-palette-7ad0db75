import { motion } from "framer-motion";
import { ScrollText, Plus, Minus, ChevronRight, RefreshCw, Wrench, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchChangelogs, Changelog, formatChangelogDate, ChangeType } from "@/lib/changelogApi";
import { Skeleton } from "@/components/ui/skeleton";

const getChangeIcon = (type: ChangeType) => {
  switch (type) {
    case 'add':
      return <Plus className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />;
    case 'fix':
      return <Wrench className="w-3 h-3 text-warning flex-shrink-0 mt-0.5" />;
    case 'remove':
      return <Minus className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />;
    case 'change':
      return <RefreshCw className="w-3 h-3 text-accent-foreground flex-shrink-0 mt-0.5" />;
    case 'security':
      return <Shield className="w-3 h-3 text-accent-foreground flex-shrink-0 mt-0.5" />;
    default:
      return <Plus className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />;
  }
};

export const ChangelogCard = () => {
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChangelogs = async () => {
      try {
        const data = await fetchChangelogs(5);
        setChangelogs(data);
      } catch (error) {
        console.error('Failed to fetch changelogs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadChangelogs();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <span className="text-sm font-display font-semibold">Changelog</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Latest Updates</span>
      </div>

      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
        {loading ? (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-2 w-10" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-3/4" />
                </div>
              </div>
            ))}
          </>
        ) : changelogs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No changelog entries yet</p>
        ) : (
          changelogs.map((entry) => (
            <div key={entry.id} className="border-l-2 border-primary/30 pl-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-display font-bold text-primary">{entry.version}</span>
                <span className="text-[9px] text-muted-foreground">{formatChangelogDate(entry.release_date)}</span>
              </div>
              <ul className="space-y-1">
                {entry.changes.slice(0, 3).map((change, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    {getChangeIcon(change.change_type)}
                    <span className="line-clamp-1">{change.description}</span>
                  </li>
                ))}
                {entry.changes.length > 3 && (
                  <li className="text-[9px] text-muted-foreground/70 pl-4">
                    +{entry.changes.length - 3} more changes
                  </li>
                )}
              </ul>
            </div>
          ))
        )}
      </div>

      <a href="/blog" className="flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 mt-3 pt-3 border-t border-border/50 transition-colors">
        View Full Changelog <ChevronRight className="w-3 h-3" />
      </a>
    </motion.div>
  );
};
