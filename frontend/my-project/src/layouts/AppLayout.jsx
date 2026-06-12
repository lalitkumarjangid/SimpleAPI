import { NavLink, Outlet } from "react-router-dom";
import UserMenu from "@/components/UserMenu";
import { cn } from "@/lib/utils";
import { LayoutGridIcon, UserPlusIcon } from "lucide-react";

const navItems = [
  { to: "/", label: "Contacts", icon: LayoutGridIcon, end: true },
  { to: "/create", label: "Add contact", icon: UserPlusIcon, end: false },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end} className="group relative flex-1 sm:flex-none">
      {({ isActive }) => (
        <span
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
          )}
        >
          <Icon
            className={cn(
              "size-4 shrink-0 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span>{label}</span>
        </span>
      )}
    </NavLink>
  );
}

export default function AppLayout({ auth, onLogout }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          {/* Brand */}
          <NavLink to="/" className="group flex min-w-0 items-center gap-3">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform duration-200 group-hover:scale-105">
              SA
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Simple API</p>
              <p className="truncate text-xs text-muted-foreground">
                {auth ? "Contact manager" : "Sign in to continue"}
              </p>
            </div>
          </NavLink>

          {/* Nav + user */}
          <div className="flex items-center gap-3">
            {auth && (
              <nav className="flex items-center rounded-xl bg-muted/50 p-1.5 ring-0.5 ring-border/50">
                {navItems.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </nav>
            )}

            {auth && (
              <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
            )}

            {auth && <UserMenu user={auth.user} onLogout={onLogout} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
