"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Loader2,
  Lock,
  Eye,
  CheckCircle2,
  Briefcase,
  User,
  Clock,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { formatRupees } from "@/lib/format";
import { createDeal } from "@/lib/api";
import { updateStoredDeal } from "@/lib/storage";
import type { Deal } from "@/lib/types";
import { toast } from "sonner";

export default function CreateDealPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Helper date generators
  const formatDateToInput = (d: Date) => {
    return d.toISOString().split("T")[0];
  };

  const getFutureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDateToInput(d);
  };

  const tomorrowStr = getFutureDate(1);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [freelancerName, setFreelancerName] = useState("Arjun Verma");
  const [timeLimitDays, setTimeLimitDays] = useState<number>(7);
  const [deadlineDate, setDeadlineDate] = useState<string>(getFutureDate(7));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const role = user?.role || "BUYER";
  const userName = user?.name || "Rohan Mehta";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectDays = (days: number) => {
    setTimeLimitDays(days);
    setDeadlineDate(getFutureDate(days));
  };

  const handleDateChange = (dateVal: string) => {
    setDeadlineDate(dateVal);
    if (dateVal) {
      const selected = new Date(dateVal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = selected.getTime() - today.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setTimeLimitDays(diffDays);
    }
  };

  const formattedDeadline = deadlineDate
    ? new Date(deadlineDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
      </div>
    );
  }

  // Role Guard: Only Clients post projects (Fixed roles, no swapping)
  if (role !== "BUYER") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16 max-w-md flex flex-col items-center justify-center text-center">
          <Card className="border-border shadow-md">
            <CardContent className="pt-8 space-y-4">
              <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center mx-auto text-blue-700 ring-1 ring-blue-200">
                <Briefcase className="size-7" />
              </div>
              <h2 className="text-xl font-bold">Client Workspace Required</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are currently signed in as <strong>{role === "SELLER" ? "Freelancer" : "Arbitrator"}</strong>.
                In Tijori, <strong>Clients post projects</strong> and fund escrow, while Freelancers work on the project and submit deliverables. Roles are locked to your registered account.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  Return to Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/login")}
                  className="text-sm"
                >
                  Sign in with Client Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const numAmount = parseInt(amount, 10);
  const validAmount = !isNaN(numAmount) && numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    if (title.length > 80) {
      toast.error("Title must be 80 characters or less");
      return;
    }
    if (!description.trim()) {
      toast.error("Please provide the required scope of work");
      return;
    }
    if (!validAmount) {
      toast.error("Please enter a valid escrow budget greater than ₹0");
      return;
    }
    if (!deadlineDate) {
      toast.error("Please specify a compulsory time limit / deadline for this project");
      return;
    }

    setIsSubmitting(true);

    try {
      let created: Deal | null = null;
      try {
        created = await createDeal({
          title: title.trim(),
          description: description.trim(),
          amount: numAmount,
        });
      } catch (err: unknown) {
        console.warn("Backend API unavailable, saving locally", err);
      }

      if (!created) {
        const id = `deal-${Date.now().toString().slice(-4)}`;
        const now = new Date().toISOString();
        created = {
          id,
          title: title.trim(),
          description: description.trim(),
          amount: numAmount,
          deliveryDeadline: deadlineDate,
          timeLimitDays: timeLimitDays || 7,
          status: "CREATED",
          sellerName: freelancerName.trim() || "Arjun Verma",
          buyerName: userName,
          deliveryProof: null,
          disputeReason: null,
          aiVerdict: null,
          timeline: [
            {
              id: `t-${Date.now()}`,
              message: `Project posted by Client (${userName}) — Compulsory deadline: ${formattedDeadline} (${timeLimitDays} days)`,
              actor: userName,
              timestamp: now,
              icon: "plus",
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
      } else {
        created.buyerName = userName;
        created.sellerName = freelancerName.trim() || "Arjun Verma";
        created.deliveryDeadline = deadlineDate;
        created.timeLimitDays = timeLimitDays || 7;
      }

      updateStoredDeal(created);
      toast.success("Project posted! You can now deposit escrow via UPI.");
      router.push(`/deals/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post project";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-12">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Builder (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                  <ShieldCheck className="size-4" />
                  <span>Client Escrow Commission Builder</span>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Post New Project
                </CardTitle>
                <CardDescription className="text-sm">
                  Define what you need built, your budget, and assigned freelancer. Funds remain safe in Tijori Escrow until you inspect and approve completed work.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="title" className="text-xs font-semibold">
                        Project Title *
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {title.length}/80
                      </span>
                    </div>
                    <Input
                      id="title"
                      placeholder="e.g. Next.js SaaS Web App + Stripe Billing Integration"
                      maxLength={80}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isSubmitting}
                      className="text-sm h-10"
                      required
                    />
                  </div>

                  {/* Target Freelancer */}
                  <div className="space-y-1.5">
                    <Label htmlFor="freelancer" className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="size-3.5 text-muted-foreground" />
                      Assigned Freelancer / Agency
                    </Label>
                    <Input
                      id="freelancer"
                      placeholder="e.g. Arjun Verma (or paste freelancer name/handle)"
                      value={freelancerName}
                      onChange={(e) => setFreelancerName(e.target.value)}
                      disabled={isSubmitting}
                      className="text-sm h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      The freelancer who will execute this project and submit deliverables.
                    </p>
                  </div>

                  {/* Agreed Scope with AI Hint */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs font-semibold">
                      Required Scope &amp; Deliverables *
                    </Label>

                    {/* Panchayat AI Helper Banner */}
                    <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 p-3.5 flex gap-2.5 items-start">
                      <Sparkles className="size-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                        <strong>Panchayat AI Guideline:</strong> Clearly specify formats, criteria, and revision
                        expectations (e.g. &ldquo;Figma designs for 10 screens + responsive mobile exports&rdquo;). In case of a dispute,
                        our AI compares deliverables against this exact scope to recommend a fair verdict.
                      </p>
                    </div>

                    <Textarea
                      id="description"
                      rows={5}
                      placeholder="Detail exact specifications: deliverables required, tech stack, milestones, acceptance criteria, and revision limits..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isSubmitting}
                      className="text-xs leading-relaxed"
                      required
                    />
                  </div>

                  {/* Compulsory Project Time Limit */}
                  <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="deadline" className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                        Project Time Limit &amp; Delivery Deadline *
                      </Label>
                      <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 text-xs font-bold uppercase tracking-wider">
                        Compulsory
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select turnaround duration or pick an exact calendar delivery date. The freelancer must deliver all agreed files before this cutoff.
                    </p>

                    {/* Quick Turnaround Presets */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "3 Days", days: 3 },
                        { label: "7 Days (1 Week)", days: 7 },
                        { label: "14 Days (2 Weeks)", days: 14 },
                        { label: "30 Days (1 Month)", days: 30 },
                      ].map((preset) => {
                        const isSelected = timeLimitDays === preset.days;
                        return (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => handleSelectDays(preset.days)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                : "bg-card text-foreground border-border hover:border-amber-400/60"
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Exact Date Picker */}
                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Exact Due Date *</span>
                        <Input
                          id="deadline"
                          type="date"
                          min={tomorrowStr}
                          value={deadlineDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          disabled={isSubmitting}
                          required
                          className="bg-card text-sm h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Allowed Turnaround</span>
                        <div className="flex items-center h-10 px-3 rounded-lg border border-border bg-card text-sm font-semibold">
                          <span className="text-foreground">{timeLimitDays} Days</span>
                          <span className="text-xs text-muted-foreground ml-auto font-normal">
                            (Due {formattedDeadline})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Escrow Budget */}
                  <div className="space-y-1.5">
                    <Label htmlFor="amount" className="text-xs font-semibold">
                      Total Escrow Budget (₹) *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-base">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        min="100"
                        step="100"
                        placeholder="15000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-8 text-lg font-bold h-11"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You will deposit this amount into Tijori Escrow via UPI. Funds are only paid out when you approve the work.
                    </p>
                  </div>

                  {/* Submit actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                      disabled={isSubmitting}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px] text-xs font-semibold shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Posting Project…
                        </>
                      ) : (
                        <>
                          Post Project &amp; Fund
                          <ArrowRight className="ml-1.5 size-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Project Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Eye className="size-3.5" />
              <span>Live Project Summary Preview</span>
            </div>

            <Card className="border-border/80 bg-card/60 shadow-md">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-0 px-2 py-0.5">
                    Awaiting Escrow Deposit
                  </Badge>
                  <span className="text-xs text-muted-foreground">Tijori Escrow Protect</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">
                    {title || "Your Project Title Will Appear Here"}
                  </h3>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {validAmount ? formatRupees(numAmount) : "₹0"}
                  </p>
                </div>

                {/* Compulsory Deadline Preview */}
                <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between border border-amber-300/60">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Clock className="size-3.5 text-amber-600 shrink-0" />
                    Delivery Cutoff: {timeLimitDays} Days
                  </span>
                  <span className="font-mono font-bold">Due {formattedDeadline}</span>
                </div>

                {/* Banner preview */}
                <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/40 p-3 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2 border border-blue-200/60">
                  <Lock className="size-4 text-blue-600 shrink-0" />
                  <span>Funds will be held safely in Tijori Escrow until you approve deliverables.</span>
                </div>

                {/* Scope preview */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Deliverables &amp; Scope
                  </span>
                  <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground leading-relaxed min-h-[90px] whitespace-pre-wrap">
                    {description || "Deliverables specifications and acceptance criteria will appear here."}
                  </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground border-t flex items-center justify-between">
                  <span>Client (You): <strong>{userName}</strong></span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3" /> Freelancer: {freelancerName || "Arjun Verma"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
