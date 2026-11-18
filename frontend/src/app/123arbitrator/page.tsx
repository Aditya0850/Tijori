"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  FileText,
  UserCheck,
  LogOut,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, PRESET_USERS } from "@/lib/auth-context";
import { getStoredDeals } from "@/lib/storage";
import { fetchDeals } from "@/lib/api";
import { formatRupees, timeAgo } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { toast } from "sonner";

export default function ArbitratorPortalPage() {
  const router = useRouter();
  const { user, isAuthenticated, loginAsPreset, logout } = useAuth();

  const [clearanceKey, setClearanceKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [activeTab, setActiveTab] = useState<"disputes" | "all">("disputes");

  // Load deals for arbitrator console
  const loadDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const apiDeals = await fetchDeals().catch(() => null);
      if (apiDeals && Array.isArray(apiDeals) && apiDeals.length > 0) {
        setDeals(apiDeals);
      } else {
        setDeals(getStoredDeals());
      }
    } catch {
      setDeals(getStoredDeals());
    } finally {
      setIsLoadingDeals(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      loadDeals();
    }
  }, [isAuthenticated, user?.role]);

  // Handle Arbitrator authentication
  const handleArbitratorLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifying(true);
    try {
      await loginAsPreset("admin");
      toast.success("Judicial clearance verified. Welcome, Chief Arbitrator.");
      loadDeals();
    } catch {
      toast.error("Arbitrator authorization failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Metrics
  const disputedDeals = useMemo(
    () => deals.filter((d) => d.status === "DISPUTED"),
    [deals]
  );
  const resolvedDeals = useMemo(
    () => deals.filter((d) => d.status.startsWith("RESOLVED_")),
    [deals]
  );
  const totalDisputedAmount = useMemo(
    () => disputedDeals.reduce((sum, d) => sum + d.amount, 0),
    [disputedDeals]
  );

  // ─────────────────────────────────────────────────────────────
  // 1. GUARD: Freelancer or Client Attempting Access
  // ─────────────────────────────────────────────────────────────
  if (isAuthenticated && user && user.role !== "ADMIN") {
    const isSeller = user.role === "SELLER";
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-red-200 dark:border-red-900/60 shadow-xl bg-card">
            <CardHeader className="text-center pb-3">
              <div className="size-14 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center mx-auto mb-3 ring-8 ring-red-50 dark:ring-red-950/30">
                <ShieldAlert className="size-7" />
              </div>
              <Badge variant="outline" className="mx-auto border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 font-semibold mb-2">
                403 Forbidden · Judicial Clearance Required
              </Badge>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                Arbitrator Access Restricted
              </CardTitle>
              <CardDescription className="text-sm mt-1.5 leading-relaxed">
                You are currently signed in as{" "}
                <strong className="text-foreground">{user.name}</strong> with the{" "}
                <span className="font-semibold text-foreground">
                  {isSeller ? "Freelancer" : "Client"}
                </span>{" "}
                role. This desk is strictly designated for authorized Tijori Arbitrators and Panchayat AI Compliance Officers.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                  <Lock className="size-3.5 text-red-600" />
                  Regulatory Segregation Policy
                </div>
                <p className="text-xs leading-relaxed">
                  Under Tijori Escrow Compliance rules, buyers and sellers are barred from viewing judicial dossier evidence, neural weights, and dispute override controls of other counterparties.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  Return to My Workspace Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await logout();
                    toast.info("Signed out. Please enter Arbitrator credentials.");
                  }}
                  className="w-full text-xs gap-1.5 border-border/80"
                >
                  <LogOut className="size-3.5" />
                  Sign Out & Authenticate as Arbitrator
                </Button>
              </div>
            </CardContent>

            <CardFooter className="pt-0 justify-center text-xs text-muted-foreground border-t border-border/40 py-3">
              Tijori Judicial Network · Clearance Level 3
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. UNAUTHENTICATED: Arbitrator Authentication Screen
  // ─────────────────────────────────────────────────────────────
  if (!isAuthenticated || !user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-amber-200/80 dark:border-amber-900/60 shadow-xl bg-card">
            <CardHeader className="text-center pb-4">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20">
                <Scale className="size-7" />
              </div>
              <Badge className="mx-auto bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 font-semibold mb-2">
                Panchayat AI Compliance Portal
              </Badge>
              <CardTitle className="text-2xl font-extrabold tracking-tight">
                Arbitrator Clearance Desk
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Restricted portal for certified dispute arbitrators & legal compliance officers.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleArbitratorLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Judicial Passkey / Security Clearance ID</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="TIJORI-ARBITRATOR-PIN"
                      value={clearanceKey}
                      onChange={(e) => setClearanceKey(e.target.value)}
                      className="pl-9 font-mono text-sm tracking-wider h-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Demo key is pre-authorized. Click below to verify credentials.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm h-10 gap-2 shadow-sm"
                >
                  {isVerifying ? (
                    <>Verifying Clearance Key…</>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Authenticate as Chief Arbitrator
                      <ArrowRight className="size-3.5 ml-auto" />
                    </>
                  )}
                </Button>
              </form>

              <div className="rounded-xl border border-amber-200/60 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
                <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-xs">
                  <Sparkles className="size-3.5" />
                  Panchayat AI Audit Engine
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Arbitrators receive automated natural language briefings, contract delta checks, and pro-rata settlement recommendations for all disputed escrow transactions.
                </p>
              </div>
            </CardContent>

            <CardFooter className="pt-0 justify-between text-xs text-muted-foreground border-t border-border/40 py-3">
              <span className="flex items-center gap-1">
                <Lock className="size-3 text-emerald-600" /> 256-bit Encrypted Judicial Session
              </span>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="hover:underline text-foreground"
              >
                Back to Public Login
              </button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. AUTHORIZED ARBITRATOR CONSOLE (ADMIN)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold text-xs border-amber-300">
                <Scale className="size-3 mr-1" /> Judicial Console
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Port: /123arbitrator
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Panchayat AI Arbitration Desk
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Signed in as <strong className="text-foreground">{user.name}</strong> ({user.roleTitle || "Chief Arbitrator"}) · Full judicial authority to ratify or override Panchayat AI verdicts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDeals}
              disabled={isLoadingDeals}
              className="text-xs gap-1.5 h-9"
            >
              <RefreshCw className={`size-3.5 ${isLoadingDeals ? "animate-spin" : ""}`} />
              Refresh Cases
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-xs gap-1.5 h-9"
            >
              General Dashboard
            </Button>
          </div>
        </div>

        {/* Executive Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-red-200/80 bg-red-50/20 dark:bg-red-950/20">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Pending Disputes</span>
                <ShieldAlert className="size-4 text-red-600" />
              </div>
              <div className="text-2xl font-black text-red-600">
                {disputedDeals.length}
              </div>
              <p className="text-xs text-red-600 font-medium">
                {disputedDeals.length > 0 ? "Requires arbitrator ruling" : "All cases settled"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Escrow in Dispute</span>
                <Lock className="size-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {formatRupees(totalDisputedAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Held safely in Tijori vault
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Settled Disputes</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {resolvedDeals.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Pro-rata & full rulings
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Panchayat AI Precision</span>
                <Sparkles className="size-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                98.4%
              </div>
              <p className="text-xs text-muted-foreground">
                Arbitrator agreement rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <TabsList className="h-9">
                <TabsTrigger value="disputes" className="text-xs gap-1.5 font-semibold">
                  <ShieldAlert className="size-3.5 text-red-600" />
                  Active Disputes ({disputedDeals.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs gap-1.5 font-semibold">
                  <Layers className="size-3.5" />
                  All Escrow Contracts ({deals.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: ACTIVE DISPUTES */}
            <TabsContent value="disputes" className="pt-4 space-y-4">
              {disputedDeals.length === 0 ? (
                <Card className="border-dashed p-10 text-center">
                  <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="font-bold text-base">No Pending Disputes</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    All escrow transactions are progressing normally. When a buyer or seller files a grievance, it will appear here with an instant Panchayat AI briefing.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {disputedDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      className="border-red-200 dark:border-red-950/80 bg-card hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-0 text-xs px-2 py-0.5 font-bold">
                              HIGH PRIORITY ARBITRATION
                            </Badge>
                            <CardTitle className="text-base font-bold line-clamp-1">
                              {deal.title}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {deal.sellerName} (Seller) vs {deal.buyerName || "Buyer"}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-foreground">
                              {formatRupees(deal.amount)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Locked in Escrow
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0">
                        {/* Dispute claim */}
                        {deal.disputeReason && (
                          <div className="rounded-lg bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 p-2.5 text-xs text-red-900 dark:text-red-200">
                            <strong className="block text-xs text-red-700 uppercase font-bold tracking-wider mb-0.5">
                              Client Grievance Claim:
                            </strong>
                            &ldquo;{deal.disputeReason}&rdquo;
                          </div>
                        )}

                        {/* Panchayat AI Verdict preview */}
                                                {deal.aiVerdict ? (
                                                  <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 p-3 text-xs space-y-1.5">
                                                    <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200">
                                                      <span className="flex items-center gap-1.5">
                                                        <Scale className="size-3.5" />
                                                        Panchayat AI: {deal.aiVerdict.recommendation}
                                                      </span>
                                                      {deal.aiVerdict.recommendation === "SPLIT" && (
                                                        <span className="font-mono text-xs font-semibold bg-amber-100/80 px-2 py-0.5 rounded">
                                                          {deal.aiVerdict.sellerSharePercent}% Seller
                                                        </span>
                                                      )}
                                                    </div>
                                                    <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                                                      {deal.aiVerdict.reasoning}
                                                    </p>
                                                  </div>
                                                ) : (
                          <div className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                            Awaiting AI neural synthesis or manual arbitrator ruling.
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="pt-2 border-t border-border/50">
                        <Button
                          onClick={() => router.push(`/deals/${deal.id}`)}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                        >
                          <Scale className="size-3.5" />
                          Open Judicial Dossier & Issue Ruling
                          <ChevronRight className="size-3.5 ml-auto" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: ALL CONTRACTS */}
            <TabsContent value="all" className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deals.map((deal) => (
                  <Card
                    key={deal.id}
                    onClick={() => router.push(`/deals/${deal.id}`)}
                    className="cursor-pointer hover:border-emerald-500/50 transition-all p-4 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm line-clamp-1">{deal.title}</span>
                      <Badge variant="outline" className="text-xs px-2 py-0.5 shrink-0">
                        {deal.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>{deal.sellerName} → {deal.buyerName || "Unassigned"}</span>
                      <span className="font-bold text-foreground">{formatRupees(deal.amount)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground border-t border-border/40 pt-2 flex items-center justify-between">
                      <span>Created {timeAgo(deal.createdAt)}</span>
                      <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                        Inspect <ExternalLink className="size-2.5" />
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
