import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SpamShield",
  description:
    "How SpamShield handles Google account data, Gmail access, retention, and deletion controls.",
};

const sections = [
  {
    title: "What SpamShield accesses",
    body:
      "SpamShield supports Google sign-in and optional Gmail inbox scanning. For Gmail, the app requests read-only Gmail access so it can list messages, fetch message content selected by the signed-in user, and classify those messages for spam risk.",
  },
  {
    title: "What SpamShield stores",
    body:
      "SpamShield stores your account profile, encrypted Gmail OAuth tokens, classification history entries, feedback, sender or domain rules, and personalization settings. The app stores message metadata needed for history and insights, including sender, subject snippet, message ID, classification result, and timestamps.",
  },
  {
    title: "What SpamShield does not store by default",
    body:
      "SpamShield does not store full Gmail message bodies or attachments as part of history. Gmail tokens are cleared when you disconnect Gmail or delete your account.",
  },
  {
    title: "How Google user data is used",
    body:
      "Google user data is used only to provide the user-facing spam-classification features requested by the signed-in user, including inbox scanning, history, and user-configured personalization. SpamShield does not use Gmail data for advertising, does not sell Gmail data, and does not transfer Gmail data to data brokers.",
  },
  {
    title: "Security protections",
    body:
      "Session cookies are HTTP-only. Gmail OAuth tokens are encrypted at rest on the server. Gmail access is limited to read-only scope, and users can revoke access by disconnecting Gmail.",
  },
  {
    title: "Data retention and deletion controls",
    body:
      "Signed-in users can clear classification history, disconnect Gmail, reset personalization, and delete their account from the Settings screen. Deleting the account removes stored history and user-scoped data and clears the active session.",
  },
  {
    title: "Google API Services User Data Policy",
    body:
      "SpamShield's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/[0.08] bg-surface-2/50 p-8 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-primary/75">
              Privacy Policy
            </p>
            <h1 className="text-4xl font-display font-bold text-foreground">
              SpamShield Privacy Policy
            </h1>
            <p className="text-sm leading-7 text-muted-foreground">
              Effective date: March 25, 2026.
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              This page describes how SpamShield handles account data and Gmail
              data when you use Google sign-in or connect Gmail.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-white/[0.06] bg-black/10 p-5"
              >
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/8 p-5">
            <h2 className="text-lg font-semibold text-foreground">
              User controls
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              To manage or delete your data, sign in and open Settings. The app
              provides controls for Gmail disconnect, history deletion,
              personalization reset, and full account deletion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
