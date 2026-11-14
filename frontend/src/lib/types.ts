// ── Deal statuses ──────────────────────────────────────────────
export type DealStatus =
  | "CREATED"
  | "FUNDED"
  | "DELIVERED"
  | "COMPLETED"
  | "DISPUTED"
  | "RESOLVED_RELEASED"
  | "RESOLVED_REFUNDED"
  | "RESOLVED_SPLIT";

// ── Role ───────────────────────────────────────────────────────
export type Role = "SELLER" | "BUYER" | "ADMIN";

// ── User / Auth Profile ────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleTitle?: string;
  upiId?: string;
  phone?: string;
  avatarUrl?: string;
  isVerified: boolean;
  memberSince?: string;
}

// ── AI verdict ─────────────────────────────────────────────────
export type VerdictType = "RELEASE" | "REFUND" | "SPLIT";

export interface AiVerdict {
  recommendation: VerdictType;
  sellerSharePercent: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string;
}

// ── Event (from backend) ───────────────────────────────────────
export interface Event {
  id: string;
  dealId: string;
  type: DealStatus;
  fromStatus: string;
  toStatus: string;
  actorRole: "seller" | "buyer" | "admin";
  actorName: string;
  note: string;
  createdAt: string; // ISO
}

// ── Deal ───────────────────────────────────────────────────────
export interface Deal {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: DealStatus;
  sellerName: string;
  buyerName: string | null;
  deliveryDeadline?: string; // Formatted date e.g. "2026-11-21" or ISO
  timeLimitDays?: number; // e.g. 7 days
  deliveryProof: string | null;
  disputeReason: string | null;
  aiVerdict: AiVerdict | null;
  events: Event[];
  createdAt: string; // ISO
  updatedAt?: string; // ISO (optional, can be derived from last event)
}

// ── Dashboard stats ────────────────────────────────────────────
export interface DashboardStats {
  totalDeals: number;
  moneyInEscrow: number;
  completedValue: number;
  disputes: number;
  openDisputes?: number;
  resolvedDisputes?: number;
}
