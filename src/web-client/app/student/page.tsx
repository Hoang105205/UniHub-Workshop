'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';

export default function StudentPage() {
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto max-w-3xl rounded-[20px] border border-[#91918c59] bg-white p-6">
        <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
          Student Zone
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em]">
          Student workspace
        </h1>
        <p className="mt-2 text-[#62625b]">
          Access only for users with student role.
        </p>

        <button
          className="mt-4 rounded-2xl bg-[#e5e5e0] px-4 py-2.5 text-sm text-black transition hover:-translate-y-px hover:brightness-95"
          onClick={onLogout}
        >
          Logout
        </button>
      </section>
    </main>
  );
}
