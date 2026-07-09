import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Mail,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Emails", href: "/emails", icon: Mail },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-2xl">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border/50">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <Bot size={20} className="group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-bold text-sidebar-foreground tracking-tight">Outreach<span className="text-sidebar-primary">AI</span></span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer mb-2" onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })}>
          <LogOut size={18} className="text-sidebar-foreground/50" />
          <span className="text-sm font-medium text-sidebar-foreground/70">Sign out</span>
        </div>
        
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 bg-sidebar-accent/30 rounded-lg group hover:bg-sidebar-accent transition-colors">
          <img
            src={user?.imageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName}`}
            alt="Profile"
            className="h-8 w-8 rounded-full bg-sidebar-border"
          />
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName || "User"}</span>
            <span className="text-xs text-sidebar-foreground/50 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
          </div>
        </Link>
      </div>
    </div>
  );
}