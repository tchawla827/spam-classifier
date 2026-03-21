import { cn } from "@/lib/utils";

const footerLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
  { label: "GitHub", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-foreground">
            SpamShield
          </span>

          <nav aria-label="Footer" className="flex gap-6">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={cn(
                  "text-sm text-muted-foreground",
                  "hover:text-foreground transition-colors"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <span className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} SpamShield. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
