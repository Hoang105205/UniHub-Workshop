import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto max-w-3xl rounded-[20px] border border-[#91918c59] bg-white p-6">
        <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
          UniHub Workshop
        </span>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em]">
          Authentication & RBAC demo
        </h1>
        <p className="mt-3 text-[#62625b]">
          Use email/password only. Choose login or register to continue.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-2xl bg-[#e60023] px-4 py-2.5 text-sm text-white transition hover:-translate-y-px hover:brightness-95"
            href="/auth/login"
          >
            Login
          </Link>
          <Link
            className="rounded-2xl bg-[#e5e5e0] px-4 py-2.5 text-sm text-black transition hover:-translate-y-px hover:brightness-95"
            href="/auth/register"
          >
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}
