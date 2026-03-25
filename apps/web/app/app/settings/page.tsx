"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Shield,
  Sliders,
  UserX,
  Trash2,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Ban,
  MailX,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import {
  getPreferences,
  updatePreferences,
  getRules,
  addSenderRule,
  addDomainRule,
  deleteRule,
  disconnectGmail,
  resetPersonalization,
  deleteAccount,
  type PreferencesResponse,
  type SenderRule,
  type DomainRule,
} from "../../../lib/api/preferences";
import { clearHistory } from "../../../lib/api/history";

// ── Types ────────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="h-8 w-8 rounded-lg bg-surface-2/80 border border-white/[0.07] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-2/40 border border-white/[0.06] p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={state}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs",
          state === "saving" && "text-muted-foreground",
          state === "saved" && "text-emerald-400",
          state === "error" && "text-destructive"
        )}
      >
        {state === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
        {state === "saved" && <CheckCircle2 className="h-3 w-3" />}
        {state === "error" && <AlertTriangle className="h-3 w-3" />}
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save failed"}
      </motion.span>
    </AnimatePresence>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
  requireTyped,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  requireTyped?: string;
}) {
  const [typed, setTyped] = useState("");
  const canConfirm = !requireTyped || typed === requireTyped;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-surface-1 border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        {requireTyped && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Type <span className="font-mono text-foreground">{requireTyped}</span> to confirm
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTyped}
              autoFocus
              className={cn(
                "w-full rounded-lg px-3 py-2 text-sm",
                "bg-surface-2/60 border border-white/[0.08]",
                "text-foreground placeholder:text-muted-foreground/40",
                "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40",
                "transition-colors"
              )}
            />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(
              "px-4 py-1.5 text-sm rounded-lg font-medium transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              destructive
                ? "bg-destructive/80 hover:bg-destructive text-white"
                : "bg-primary/80 hover:bg-primary text-primary-foreground"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Sensitivity section ───────────────────────────────────────────────────────

const SENSITIVITY_OPTIONS = [
  {
    value: "relaxed" as const,
    label: "Relaxed",
    description: "Fewer spam detections — better for low-noise inboxes",
  },
  {
    value: "balanced" as const,
    label: "Balanced",
    description: "Default threshold — recommended for most users",
  },
  {
    value: "strict" as const,
    label: "Strict",
    description: "More aggressive detection — higher sensitivity",
  },
];

function SensitivitySection({
  prefs,
  onUpdate,
  saveState,
}: {
  prefs: PreferencesResponse;
  onUpdate: (updates: Partial<PreferencesResponse>) => void;
  saveState: SaveState;
}) {
  return (
    <Section>
      <SectionHeader
        icon={Sliders}
        title="Detection Sensitivity"
        description="Controls how aggressively the classifier flags emails as spam."
      />
      <div className="space-y-2">
        {SENSITIVITY_OPTIONS.map((opt) => {
          const isSelected = prefs.sensitivity === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex items-start gap-3 rounded-lg p-3 cursor-pointer border transition-all duration-150",
                isSelected
                  ? "bg-primary/10 border-primary/30"
                  : "bg-surface-1/30 border-white/[0.05] hover:bg-surface-2/60 hover:border-white/[0.1]"
              )}
            >
              <input
                type="radio"
                name="sensitivity"
                value={opt.value}
                checked={isSelected}
                onChange={() => onUpdate({ sensitivity: opt.value })}
                className="mt-0.5 accent-primary"
              />
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {opt.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-4 space-y-3 border-t border-white/[0.05] pt-4">
        {/* Personalization toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Personalization
            </p>
            <p className="text-xs text-muted-foreground">
              Apply your rules and feedback to adjust results
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.personalization_enabled}
            onClick={() =>
              onUpdate({ personalization_enabled: !prefs.personalization_enabled })
            }
            className={cn(
              "relative h-5 w-9 rounded-full border transition-all duration-200 shrink-0",
              prefs.personalization_enabled
                ? "bg-primary border-primary/60"
                : "bg-surface-3/60 border-white/[0.1]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                prefs.personalization_enabled ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {/* Review band toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Review Band</p>
            <p className="text-xs text-muted-foreground">
              Flag uncertain emails as &quot;review&quot; instead of forcing a verdict
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.review_band_enabled}
            onClick={() =>
              onUpdate({ review_band_enabled: !prefs.review_band_enabled })
            }
            className={cn(
              "relative h-5 w-9 rounded-full border transition-all duration-200 shrink-0",
              prefs.review_band_enabled
                ? "bg-primary border-primary/60"
                : "bg-surface-3/60 border-white/[0.1]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                prefs.review_band_enabled ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <SaveIndicator state={saveState} />
      </div>
    </Section>
  );
}

// ── Rules section ─────────────────────────────────────────────────────────────

function AddRuleRow({
  placeholder,
  actionLabel,
  actionVariant,
  onAdd,
}: {
  placeholder: string;
  actionLabel: string;
  actionVariant: "trust" | "block";
  onAdd: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    const v = value.trim();
    if (!v) return;
    setError(null);
    setLoading(true);
    try {
      await onAdd(v);
      setValue("");
    } catch {
      setError("Failed to add rule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={placeholder}
          disabled={loading}
          className={cn(
            "flex-1 rounded-lg px-3 py-1.5 text-sm",
            "bg-surface-1/40 border border-white/[0.08]",
            "text-foreground placeholder:text-muted-foreground/40",
            "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40",
            "disabled:opacity-50 transition-colors"
          )}
        />
        <button
          type="button"
          disabled={!value.trim() || loading}
          onClick={handleAdd}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border",
            "transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
            actionVariant === "trust"
              ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              : "border-destructive/30 text-destructive/80 hover:bg-destructive/10"
          )}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          {actionLabel}
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function RuleTag({
  label,
  action,
  onDelete,
}: {
  label: string;
  action: "trust" | "block";
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    onDelete();
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg pl-2.5 pr-1.5 py-1 text-xs font-medium border",
        action === "trust"
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          : "bg-destructive/10 border-destructive/25 text-destructive/80"
      )}
    >
      {label}
      <button
        type="button"
        disabled={deleting}
        onClick={handleDelete}
        aria-label={`Remove rule for ${label}`}
        className="rounded p-0.5 hover:bg-white/10 transition-colors disabled:opacity-40"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function RulesSection({
  senders,
  domains,
  onAddSender,
  onAddDomain,
  onDeleteRule,
}: {
  senders: SenderRule[];
  domains: DomainRule[];
  onAddSender: (sender: string) => Promise<void>;
  onAddDomain: (domain: string) => Promise<void>;
  onDeleteRule: (id: string) => void;
}) {
  return (
    <Section>
      <SectionHeader
        icon={Shield}
        title="Sender & Domain Rules"
        description="Force classifications for specific senders or domains, overriding the model."
      />

      {/* Sender rules */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Trusted Senders
        </p>
        <AddRuleRow
          placeholder="newsletter@example.com"
          actionLabel="Trust"
          actionVariant="trust"
          onAdd={onAddSender}
        />
        {senders.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {senders.map((s) => (
              <RuleTag
                key={s.id}
                label={s.sender}
                action={s.action}
                onDelete={() => onDeleteRule(s.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">
            No sender rules yet.
          </p>
        )}
      </div>

      {/* Domain rules */}
      <div className="mt-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Blocked Domains
        </p>
        <AddRuleRow
          placeholder="spam-domain.com"
          actionLabel="Block"
          actionVariant="block"
          onAdd={onAddDomain}
        />
        {domains.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {domains.map((d) => (
              <RuleTag
                key={d.id}
                label={d.domain}
                action={d.action}
                onDelete={() => onDeleteRule(d.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">
            No domain rules yet.
          </p>
        )}
      </div>
    </Section>
  );
}

// ── Privacy section ───────────────────────────────────────────────────────────

type PrivacyAction =
  | "clear-history"
  | "disconnect-gmail"
  | "reset-personalization"
  | "delete-account"
  | null;

function PrivacyButton({
  label,
  description,
  icon: Icon,
  variant,
  onClick,
  loading,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  variant: "danger" | "warning" | "neutral";
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border shrink-0",
          "transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
          variant === "danger"
            ? "border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:border-destructive/50"
            : variant === "warning"
            ? "border-amber-500/30 text-amber-400/80 hover:bg-amber-500/10 hover:border-amber-500/50"
            : "border-white/[0.08] text-muted-foreground hover:bg-surface-3/60 hover:text-foreground"
        )}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className="h-3 w-3" />
        )}
        {label}
      </button>
    </div>
  );
}

function PrivacySection({
  gmailConnected,
  onAction,
  loadingAction,
}: {
  gmailConnected: boolean;
  onAction: (action: PrivacyAction) => void;
  loadingAction: PrivacyAction;
}) {
  return (
    <Section>
      <SectionHeader
        icon={UserX}
        title="Privacy Controls"
        description="Manage your data. All destructive actions require confirmation."
      />
      <div className="space-y-4 divide-y divide-white/[0.04]">
        <PrivacyButton
          label="Clear All History"
          description="Permanently delete all your past classification records."
          icon={Trash2}
          variant="warning"
          loading={loadingAction === "clear-history"}
          onClick={() => onAction("clear-history")}
        />
        {gmailConnected && (
          <div className="pt-4">
            <PrivacyButton
              label="Disconnect Gmail"
              description="Revoke Gmail access and remove stored tokens."
              icon={MailX}
              variant="warning"
              loading={loadingAction === "disconnect-gmail"}
              onClick={() => onAction("disconnect-gmail")}
            />
          </div>
        )}
        <div className="pt-4">
          <PrivacyButton
            label="Reset Personalization"
            description="Clear all feedback-derived adjustments and start fresh."
            icon={RefreshCw}
            variant="neutral"
            loading={loadingAction === "reset-personalization"}
            onClick={() => onAction("reset-personalization")}
          />
        </div>
        <div className="pt-4">
          <PrivacyButton
            label="Delete Account"
            description="Permanently delete your account and all associated data. Cannot be undone."
            icon={Ban}
            variant="danger"
            loading={loadingAction === "delete-account"}
            onClick={() => onAction("delete-account")}
          />
        </div>
      </div>
    </Section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { user, refreshUser } = useAuth();

  const [prefs, setPrefs] = useState<PreferencesResponse | null>(null);
  const [senders, setSenders] = useState<SenderRule[]>([]);
  const [domains, setDomains] = useState<DomainRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefsSaveState, setPrefsSaveState] = useState<SaveState>("idle");

  const [confirmAction, setConfirmAction] = useState<PrivacyAction>(null);
  const [loadingAction, setLoadingAction] = useState<PrivacyAction>(null);

  // Load prefs + rules
  useEffect(() => {
    Promise.all([getPreferences(), getRules()])
      .then(([p, r]) => {
        setPrefs(p);
        setSenders(r.senders);
        setDomains(r.domains);
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-save preferences on change
  const handlePrefsUpdate = useCallback(
    async (updates: Partial<PreferencesResponse>) => {
      if (!prefs) return;
      const next = { ...prefs, ...updates };
      setPrefs(next);
      setPrefsSaveState("saving");
      try {
        const saved = await updatePreferences(updates);
        setPrefs(saved);
        setPrefsSaveState("saved");
        setTimeout(() => setPrefsSaveState("idle"), 2000);
      } catch {
        setPrefsSaveState("error");
        setTimeout(() => setPrefsSaveState("idle"), 3000);
      }
    },
    [prefs]
  );

  const handleAddSender = useCallback(async (sender: string) => {
    const result = await addSenderRule(sender, "trust");
    setSenders((prev) => [...prev, { id: result.id, sender, action: "trust" }]);
  }, []);

  const handleAddDomain = useCallback(async (domain: string) => {
    const result = await addDomainRule(domain, "block");
    setDomains((prev) => [...prev, { id: result.id, domain, action: "block" }]);
  }, []);

  const handleDeleteRule = useCallback(async (id: string) => {
    await deleteRule(id);
    setSenders((prev) => prev.filter((s) => s.id !== id));
    setDomains((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Privacy actions
  const handlePrivacyAction = useCallback((action: PrivacyAction) => {
    setConfirmAction(action);
  }, []);

  const executePrivacyAction = useCallback(async () => {
    if (!confirmAction) return;
    setConfirmAction(null);
    setLoadingAction(confirmAction);
    try {
      if (confirmAction === "clear-history") {
        await clearHistory();
      } else if (confirmAction === "disconnect-gmail") {
        await disconnectGmail();
        await refreshUser();
      } else if (confirmAction === "reset-personalization") {
        await resetPersonalization();
      } else if (confirmAction === "delete-account") {
        await deleteAccount();
        router.push("/");
        return;
      }
    } catch {
      // Action failed silently — user sees loading stop
    } finally {
      setLoadingAction(null);
    }
  }, [confirmAction, refreshUser, router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] },
    },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">
            Settings
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Preferences & Rules
        </h1>
        <p className="text-sm text-muted-foreground">
          Customize detection sensitivity, manage overrides, and control your data.
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
        </div>
      ) : !prefs ? (
        <div className="rounded-xl bg-surface-2/40 border border-white/[0.06] p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load settings. Please refresh.
          </p>
        </div>
      ) : (
        <motion.div
          variants={reducedMotion ? undefined : containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.div variants={reducedMotion ? undefined : itemVariants}>
            <SensitivitySection
              prefs={prefs}
              onUpdate={handlePrefsUpdate}
              saveState={prefsSaveState}
            />
          </motion.div>

          <motion.div variants={reducedMotion ? undefined : itemVariants}>
            <RulesSection
              senders={senders}
              domains={domains}
              onAddSender={handleAddSender}
              onAddDomain={handleAddDomain}
              onDeleteRule={handleDeleteRule}
            />
          </motion.div>

          <motion.div variants={reducedMotion ? undefined : itemVariants}>
            <PrivacySection
              gmailConnected={user?.gmail_connected ?? false}
              onAction={handlePrivacyAction}
              loadingAction={loadingAction}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Confirm dialogs */}
      <AnimatePresence>
        {confirmAction === "clear-history" && (
          <ConfirmDialog
            title="Clear All History"
            message="Permanently delete all your classification history? This cannot be undone."
            confirmLabel="Clear history"
            destructive
            onConfirm={executePrivacyAction}
            onCancel={() => setConfirmAction(null)}
          />
        )}
        {confirmAction === "disconnect-gmail" && (
          <ConfirmDialog
            title="Disconnect Gmail"
            message="This will revoke SpamShield's access to your Gmail and delete stored tokens. You can reconnect at any time."
            confirmLabel="Disconnect"
            destructive
            onConfirm={executePrivacyAction}
            onCancel={() => setConfirmAction(null)}
          />
        )}
        {confirmAction === "reset-personalization" && (
          <ConfirmDialog
            title="Reset Personalization"
            message="This will delete all sender and domain rules, reset your feedback profile to zero, and restore default sensitivity settings. Cannot be undone."
            confirmLabel="Reset"
            destructive
            onConfirm={executePrivacyAction}
            onCancel={() => setConfirmAction(null)}
          />
        )}
        {confirmAction === "delete-account" && (
          <ConfirmDialog
            title="Delete Account"
            message="Permanently delete your account, all history, rules, feedback, and Gmail tokens. This cannot be undone."
            confirmLabel="Delete my account"
            destructive
            requireTyped="delete my account"
            onConfirm={executePrivacyAction}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
