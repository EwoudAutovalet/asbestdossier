"use client";

import { Header } from "./header";
import type { Profile } from "@/lib/types";

interface AppShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function AppShell({ profile, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header profile={profile} />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <footer className="bg-card border-t py-3 px-8 flex justify-between text-xs text-muted-foreground">
        <span>AsbestControl — SaaS platform voor asbestbeheer</span>
        <span>OVAM-conform &middot; AVG-compliant</span>
      </footer>
    </div>
  );
}
