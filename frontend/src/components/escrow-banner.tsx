import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/format";
import type { DealStatus, AiVerdict } from "@/lib/types";

interface EscrowBannerProps {
  status: DealStatus;
  amount: number;
  aiVerdict?: AiVerdict;
}

interface BannerConfig {
  icon: string;
  message: string;
  classes: string;
}

function getBannerConfig(
  status: DealStatus,
  amount: number,
  aiVerdict?: AiVerdict
): BannerConfig {
  // Calculate amounts from aiVerdict if SPLIT
  const sellerSharePercent = aiVerdict?.recommendation === "SPLIT" ? aiVerdict.sellerSharePercent : undefined;
  const sellerAmount = sellerSharePercent ? Math.round((amount * sellerSharePercent) / 100) : undefined;
  const buyerAmount = sellerAmount ? amount - sellerAmount : undefined;
  
  switch (status) {
    case "FUNDED":
    case "DELIVERED":
    case "DISPUTED":
      return {
        icon: "🔐",
        message: `${formatRupees(amount)} secured in Tijori Escrow Nodal Account`,
        classes:
          "bg-blue-50/70 text-blue-900 ring-blue-300/60 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800/40",
      };
    case "COMPLETED":
    case "RESOLVED_RELEASED":
      return {
        icon: "✅",
        message: `${formatRupees(amount)} successfully disbursed to seller`,
        classes:
          "bg-emerald-50/70 text-emerald-900 ring-emerald-300/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/40",
      };
    case "RESOLVED_REFUNDED":
      return {
        icon: "↩️",
        message: `${formatRupees(amount)} successfully refunded to client`,
        classes:
          "bg-emerald-50/70 text-emerald-900 ring-emerald-300/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/40",
      };
    case "RESOLVED_SPLIT":
      return {
        icon: "⚖️",
        message: `Settlement split: seller ${formatRupees(sellerAmount ?? 0)}, client ${formatRupees(buyerAmount ?? 0)}`,
        classes:
          "bg-amber-50/70 text-amber-900 ring-amber-300/60 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/40",
      };
    case "CREATED":
    default:
      return {
        icon: "⏳",
        message: "Awaiting client escrow deposit via UPI",
        classes:
          "bg-gray-50 text-gray-700 ring-gray-300/60 dark:bg-gray-900/40 dark:text-gray-300 dark:ring-gray-700/40",
      };
  }
}

export function EscrowBanner({
  status,
  amount,
  aiVerdict,
}: EscrowBannerProps) {
  const config = getBannerConfig(status, amount, aiVerdict);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 shadow-sm",
        config.classes
      )}
    >
      <span className="text-lg leading-none">{config.icon}</span>
      <span>{config.message}</span>
    </div>
  );
}
