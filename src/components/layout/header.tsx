"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Building2, LayoutDashboard, FolderOpen, Users, LogOut, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/lib/types";

interface HeaderProps {
  profile: Profile;
}

export function Header({ profile }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dossiers", label: "Dossiers", icon: FolderOpen },
    ...(profile.role === "owner"
      ? [
          { href: "/analytics", label: "Analytics", icon: BarChart3 },
          { href: "/specialisten", label: "Specialisten", icon: Users },
        ]
      : []),
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-card border-b h-14 flex items-center px-6 gap-6">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
          <Building2 className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="font-extrabold text-sm tracking-tight">
          Asbest<span className="text-primary">Control</span>
        </span>
      </div>

      <nav className="flex flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-2 px-4 h-14 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {profile.role === "owner" ? "Eigenaar" : "Specialist"}
        </span>
        <Separator orientation="vertical" className="h-6" />
        <button
          onClick={() => router.push("/profiel")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          title="Mijn profiel"
        >
          <Avatar className="h-8 w-8">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : null}
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold leading-tight">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground">{profile.email}</div>
          </div>
        </button>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Uitloggen">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
