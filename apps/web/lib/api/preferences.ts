const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PreferencesResponse {
  sensitivity: "strict" | "balanced" | "relaxed";
  personalization_enabled: boolean;
  review_band_enabled: boolean;
}

export interface PreferencesUpdate {
  sensitivity?: "strict" | "balanced" | "relaxed";
  personalization_enabled?: boolean;
  review_band_enabled?: boolean;
}

export interface SenderRule {
  id: string;
  sender: string;
  action: "trust" | "block";
  created_at: string;
}

export interface DomainRule {
  id: string;
  domain: string;
  action: "trust" | "block";
  created_at: string;
}

export interface RulesResponse {
  senders: SenderRule[];
  domains: DomainRule[];
}

export interface AddRuleResponse {
  id: string;
  sender?: string;
  domain?: string;
  action: "trust" | "block";
}

export async function getPreferences(): Promise<PreferencesResponse> {
  const res = await fetch(`${API_BASE}/api/v1/preferences`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch preferences (${res.status})`);
  return res.json();
}

export async function updatePreferences(
  updates: PreferencesUpdate
): Promise<PreferencesResponse> {
  const res = await fetch(`${API_BASE}/api/v1/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update preferences (${res.status})`);
  return res.json();
}

export async function getRules(): Promise<RulesResponse> {
  const res = await fetch(`${API_BASE}/api/v1/rules`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch rules (${res.status})`);
  return res.json();
}

export async function addSenderRule(
  sender: string,
  action: "trust" | "block"
): Promise<AddRuleResponse> {
  const res = await fetch(`${API_BASE}/api/v1/rules/senders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sender, action }),
  });
  if (!res.ok) throw new Error(`Failed to add sender rule (${res.status})`);
  return res.json();
}

export async function addDomainRule(
  domain: string,
  action: "trust" | "block"
): Promise<AddRuleResponse> {
  const res = await fetch(`${API_BASE}/api/v1/rules/domains`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ domain, action }),
  });
  if (!res.ok) throw new Error(`Failed to add domain rule (${res.status})`);
  return res.json();
}

export async function deleteRule(ruleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/rules/${ruleId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete rule (${res.status})`);
}

export async function disconnectGmail(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/gmail/disconnect`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to disconnect Gmail (${res.status})`);
}

export async function resetPersonalization(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/account/reset-personalization`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok)
    throw new Error(`Failed to reset personalization (${res.status})`);
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/account`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete account (${res.status})`);
}
