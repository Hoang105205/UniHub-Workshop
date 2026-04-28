import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto max-w-3xl rounded-[20px] border border-[#91918c59] bg-white p-6">
        <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
          403
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em]">
          You do not have permission to access this route
        </h1>
        <p className="mt-2 text-[#62625b]">
          Please sign in with a role that matches this area.
        </p>
        <p className="mt-4 text-sm">
          <Link className="underline" href="/auth/login">
            Back to login
          </Link>
        </p>
      </section>
    </main>
  );
}
