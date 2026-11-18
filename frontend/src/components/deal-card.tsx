"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { formatRupees, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { User, ChevronRight, Clock, ShieldCheck } from "lucide-react";
import type { Deal } from "@/lib/types";

interface DealCardProps {
  deal: Deal;
  counterpartyName: string;
  actionNeeded?: boolean;
}

export function DealCard({ deal, counterpartyName, actionNeeded }: DealCardProps) {
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(`/deals/${deal.id}`);
    }
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200 border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      )}
      onClick={() => router.push(`/deals/${deal.id}`)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View contract ${deal.id}: ${deal.title}, ${formatRupees(deal.amount)}`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col gap-3.5">
        {/* Top: Deal ID + StatusBadge */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            {deal.id}
          </span>
          <StatusBadge status={deal.status} />
        </div>

        {/* Title & Amount */}
        <div className="space-y-1">
          <h3 className="line-clamp-1 font-bold text-base leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {deal.title}
          </h3>
          <p className="text-xl font-extrabold tracking-tight text-foreground">
            {formatRupees(deal.amount)}
          </p>
        </div>

        {/* Bottom row: Counterparty + Timestamp + Action Tag */}
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 truncate">
            <div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0" aria-hidden="true">
              {counterpartyName.slice(0, 1).toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium text-foreground/80">{counterpartyName}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
                      {actionNeeded && (
                        <Badge className="border-0 bg-amber-100 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300" aria-live="polite">
                          Action Needed
                        </Badge>
                      )}
                      <time className="text-xs sm:text-sm" dateTime={deal.createdAt}>{timeAgo(deal.createdAt)}</time>
                      <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </div>
        </div>
      </CardContent>
    </Card>
  );
}
