import Link from 'next/link';
import { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const pinHeights = ['h-20', 'h-30', 'h-20', 'h-20', 'h-30', 'h-20'];

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between p-6 sm:p-10">
        <div>
          <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
            UniHub Workshop
          </span>
          <h2 className="mt-4 max-w-[12ch] text-[clamp(2rem,7vw,4.2rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
            {title}
          </h2>
          <p className="mt-3 text-[#62625b]">
            {subtitle}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2.5" aria-hidden="true">
            {pinHeights.map((height, index) => (
              <div
                key={index}
                className={`${height} rounded-[18px] border border-[#91918c4d] bg-linear-to-br from-[#e5e5e0cc] to-[#f6f6f3e6]`}
              />
            ))}
          </div>
        </div>

        <div className="text-sm text-[#62625b]">
          <p>Need quick access?</p>
          <p>
            Go to{' '}
            <Link className="underline" href="/auth/login">
              Login
            </Link>{' '}
            or{' '}
            <Link className="underline" href="/auth/register">
              Register
            </Link>
          </p>
        </div>
      </section>

      <section className="flex items-start justify-center p-5 lg:items-center">{children}</section>
    </main>
  );
}
