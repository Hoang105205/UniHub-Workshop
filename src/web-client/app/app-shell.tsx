"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchProfile, logout } from "@/lib/auth";
import { ToastProvider } from "./toast-context";

interface TopBarTab {
  id: string;
  label: string;
  href?: string;
}

const studentTabs: TopBarTab[] = [
  { id: "explore", label: "Explore", href: "/workshops" },
  {
    id: "awaiting-payment",
    label: "Awaiting payment",
    href: "/registrations/pending",
  },
  { id: "my-tickets", label: "My tickets", href: "/registrations/confirm" },
];

const adminTabs: TopBarTab[] = [
  { id: "view-analytics", label: "View analytics", href: "/admin/analytics" },
  { id: "csv-sync", label: "CSV sync history", href: "/admin/csv-sync" },
  {
    id: "create-workshop",
    label: "Create workshop",
    href: "/admin/workshops?mode=new",
  },
];

function getTopBarMeta(pathname: string) {
  if (pathname.startsWith("/admin/csv-sync")) {
    return {
      label: "CSV sync history",
      title: "Review CSV synchronization logs",
      subtitle:
        "Track processed files, sync status, and record counts for each batch.",
      backHref: "/admin/analytics",
    };
  }

  if (pathname.startsWith("/admin/workshops")) {
    return {
      label: "Workshop studio",
      title: "Build and refine workshop sessions",
      subtitle:
        "Create new sessions, edit details, and keep the catalog fresh.",
      backHref: "/admin/analytics",
    };
  }

  if (pathname.startsWith("/admin")) {
    return {
      label: "Analytics hub",
      title: "Monitor demand and performance",
      subtitle:
        "Track registrations, capacity, and revenue signals in real time.",
      backHref: undefined as string | undefined,
    };
  }

  if (pathname.startsWith("/workshops/") && pathname.includes("/confirm")) {
    return {
      label: "Registration confirmation",
      title: "Confirm your registration",
      subtitle: "Review details carefully before submitting your registration.",
      backHref: pathname.replace("/confirm", ""),
    };
  }

  if (pathname.startsWith("/registrations/confirm")) {
    return {
      label: "My tickets",
      title: "Your registered workshops",
      subtitle: "Track confirmed seats and upcoming schedules.",
      backHref: undefined as string | undefined,
    };
  }

  if (pathname.startsWith("/registrations/pending")) {
    return {
      label: "Awaiting payment",
      title: "Complete your payment",
      subtitle: "Finalize pending registrations before the hold expires.",
      backHref: "/registrations/confirm",
    };
  }

  if (pathname.startsWith("/registrations/")) {
    return {
      label: "Ticket details",
      title: "Review your ticket",
      subtitle: "Check payment status and keep track of your seat.",
      backHref: "/registrations/confirm",
    };
  }

  if (pathname.startsWith("/workshops/")) {
    return {
      label: "Workshop details",
      title: "Workshop overview",
      subtitle: "Review the agenda, venue, and registration status.",
      backHref: "/workshops",
    };
  }

  if (pathname.startsWith("/workshops")) {
    return {
      label: "Workshop directory",
      title: "Explore upcoming sessions",
      subtitle:
        "Browse live workshops, track availability, and plan your schedule.",
      backHref: undefined as string | undefined,
    };
  }

  return {
    label: "UniHub",
    title: "Welcome",
    subtitle: "Your workshop portal and student services hub.",
    backHref: undefined as string | undefined,
  };
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const isAuthRoute = pathname.startsWith("/auth");
  const [profile, setProfile] = useState<{
    fullName: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    if (isAuthRoute) {
      return;
    }

    let isMounted = true;
    fetchProfile()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setProfile({
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setProfile(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthRoute]);

  const role = profile?.role === "admin" ? "admin" : "student";
  const tabs = useMemo(
    () => (role === "admin" ? adminTabs : studentTabs),
    [role],
  );
  const meta = useMemo(() => getTopBarMeta(pathname), [pathname]);

  // If this is an auth route (login/register), render children without the shell
  if (isAuthRoute) return <>{children}</>;

  // Compute active tab more robustly based on role and pathname.
  let activeTab = "explore";

  if (role === "admin") {
    // Prefer direct startsWith matches against adminTabs
    const stripPath = (href: string) => href.split("?")[0];
    const match = adminTabs.find(
      (t) => t.href && pathname.startsWith(stripPath(t.href)),
    );
    activeTab = match?.id ?? "view-analytics";
  } else {
    // Student routes: try to match studentTabs; fallback to route-based heuristics
    const stripPath = (href: string) => href.split("?")[0];
    const match = studentTabs.find(
      (t) => t.href && pathname.startsWith(stripPath(t.href)),
    );
    if (match) {
      activeTab = match.id;
    } else if (pathname.startsWith("/registrations")) {
      activeTab = "my-tickets";
    } else if (pathname.startsWith("/workshops")) {
      activeTab = "explore";
    }
  }

  const onLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen px-4 py-6 sm:px-6">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
                  {meta.label}
                </span>
                <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#211922] sm:text-4xl">
                  {meta.title}
                </h1>
                <p className="mt-2 text-sm text-[#62625b] sm:text-base">
                  {meta.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="rounded-[18px] border border-[#91918c4d] bg-white px-3 py-2 text-xs text-[#62625b]">
                  <p className="font-semibold text-[#211922]">
                    {profile?.fullName || "Signed-in user"}
                  </p>
                  <p>{profile?.email || "Account details"}</p>
                  <span className="mt-1 inline-flex rounded-full border border-[#103c2540] bg-[#103c2512] px-2 py-0.5 text-[0.65rem] font-semibold text-[#103c25]">
                    {role === "admin" ? "Admin" : "Student"}
                  </span>
                </div>
                <button
                  className="rounded-2xl bg-[#e60023] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(230,0,35,0.25)] transition hover:-translate-y-px hover:brightness-95"
                  onClick={onLogout}
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                const className = `rounded-full border px-4 py-2 text-xs transition ${
                  isActive
                    ? "border-[#211922] bg-[#211922] text-white"
                    : "border-[#91918c4d] bg-white text-[#211922] hover:-translate-y-px"
                }`;

                if (tab.href) {
                  return (
                    <Link key={tab.id} className={className} href={tab.href}>
                      {tab.label}
                    </Link>
                  );
                }

                return (
                  <button key={tab.id} className={className} type="button">
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </header>

          {children}
        </section>
      </div>
    </ToastProvider>
  );
}
