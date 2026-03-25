import { Shield } from "lucide-react";
import { cn } from "../../lib/utils";

const navColumns = [
  {
    title: "Product",
    links: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Demo", href: "#demo" },
      { label: "Metrics", href: "#metrics" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Documentation", href: "/#how-it-works" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative py-12" aria-label="Footer">
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to right, transparent, hsl(263 84% 58% / 0.4), hsl(188 95% 43% / 0.3), transparent)",
        }}
      />

      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr] gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-lg font-display font-bold text-foreground">
                SpamShield
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Separating signal from noise.
            </p>
          </div>

          {/* Nav columns */}
          {navColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={cn(
                        "text-sm text-muted-foreground",
                        "hover:text-foreground hover:[text-shadow:0_0_12px_hsl(var(--primary)/0.3)] transition-all duration-200",
                        "rounded-sm focus-ring"
                      )}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="pt-6 border-t border-white/[0.06] text-center">
          <span className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} SpamShield. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
