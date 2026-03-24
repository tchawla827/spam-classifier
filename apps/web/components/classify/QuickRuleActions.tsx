"use client";

import { useState } from "react";
import { ShieldCheck, Ban, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { addSenderRule, addDomainRule } from "../../lib/api/preferences";

interface QuickRuleActionsProps {
  sender?: string;
  domain?: string;
  onRuleAdded?: (type: "sender" | "domain", action: "trust" | "block") => void;
}

type ActionState = "idle" | "loading" | "done" | "error";

interface RuleButtonProps {
  label: string;
  description: string;
  icon: React.ElementType;
  variant: "trust" | "block";
  state: ActionState;
  onClick: () => void;
}

function RuleButton({
  label,
  description,
  icon: Icon,
  variant,
  state,
  onClick,
}: RuleButtonProps) {
  const isTrust = variant === "trust";

  return (
    <button
      type="button"
      disabled={state === "loading" || state === "done"}
      onClick={onClick}
      aria-label={label}
      title={description}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border",
        "transition-all duration-150 focus-ring",
        "disabled:cursor-not-allowed",
        state === "done"
          ? isTrust
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 opacity-70"
            : "bg-destructive/15 border-destructive/40 text-destructive opacity-70"
          : state === "error"
          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
          : isTrust
          ? "border-emerald-500/25 text-emerald-400/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400"
          : "border-destructive/25 text-destructive/70 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : state === "done" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {state === "done" ? "Rule added" : state === "error" ? "Failed — retry" : label}
    </button>
  );
}

export function QuickRuleActions({
  sender,
  domain,
  onRuleAdded,
}: QuickRuleActionsProps) {
  const { isAuthenticated } = useAuth();
  const [senderTrustState, setSenderTrustState] = useState<ActionState>("idle");
  const [domainBlockState, setDomainBlockState] = useState<ActionState>("idle");

  if (!isAuthenticated) return null;
  if (!sender && !domain) return null;

  const handleTrustSender = async () => {
    if (!sender || senderTrustState !== "idle") return;
    setSenderTrustState("loading");
    try {
      await addSenderRule(sender, "trust");
      setSenderTrustState("done");
      onRuleAdded?.("sender", "trust");
    } catch {
      setSenderTrustState("error");
    }
  };

  const handleBlockDomain = async () => {
    if (!domain || domainBlockState !== "idle") return;
    setDomainBlockState("loading");
    try {
      await addDomainRule(domain, "block");
      setDomainBlockState("done");
      onRuleAdded?.("domain", "block");
    } catch {
      setDomainBlockState("error");
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Quick rules</p>
      <div className="flex flex-wrap gap-2">
        {sender && (
          <RuleButton
            label={`Always trust ${sender}`}
            description={`Add ${sender} to your trusted senders`}
            icon={ShieldCheck}
            variant="trust"
            state={senderTrustState}
            onClick={handleTrustSender}
          />
        )}
        {domain && (
          <RuleButton
            label={`Block ${domain}`}
            description={`Add ${domain} to your blocked domains`}
            icon={Ban}
            variant="block"
            state={domainBlockState}
            onClick={handleBlockDomain}
          />
        )}
      </div>
    </div>
  );
}
