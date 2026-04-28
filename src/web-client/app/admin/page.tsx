"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export default function AdminPage() {
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
                Admin Workspace
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#211922] sm:text-4xl">
                Manage workshops and reporting
              </h1>
              <p className="mt-2 text-sm text-[#62625b] sm:text-base">
                View analytics or create new workshop sessions for students.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded-2xl bg-[#e5e5e0] px-4 py-2 text-xs text-black transition hover:-translate-y-px hover:brightness-95"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-[#211922] bg-[#211922] px-4 py-2 text-xs text-white"
              type="button"
            >
              View analytics
            </button>
            <button
              className="rounded-full border border-[#91918c4d] bg-white px-4 py-2 text-xs text-[#211922] transition hover:-translate-y-px"
              type="button"
            >
              Create workshop
            </button>
          </div>
        </header>
      </section>
    </main>
  );
}
