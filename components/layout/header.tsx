"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { usePathname } from "next/navigation";
import { getPendingReviewCount } from "@/lib/local-store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/outreach", label: "Outreach" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/logs", label: "Logs" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function refresh() {
      setPendingReviewCount(getPendingReviewCount());
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden" />}
        >
          <MenuIcon className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <div className="flex h-14 items-center border-b border-border px-5">
            <span className="text-lg font-bold">Asterley Outreach</span>
          </div>
          <nav className="space-y-1 px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {pendingReviewCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {pendingReviewCount} pending review
          </Badge>
        )}
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Rob — Asterley Bros
        </span>
      </div>
    </header>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
