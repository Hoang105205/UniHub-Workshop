'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';

const workshops = [
  {
    id: 1,
    title: 'Modern NestJS API Design',
    speaker: 'Tran Minh Anh',
    room: 'A1-201',
    time: '09:00 - 10:30',
    seatsLeft: 12,
  },
  {
    id: 2,
    title: 'Next.js App Router in Practice',
    speaker: 'Nguyen Hoang Son',
    room: 'B2-105',
    time: '10:45 - 12:00',
    seatsLeft: 7,
  },
  {
    id: 3,
    title: 'Secure Auth with JWT & RBAC',
    speaker: 'Le Thu Ha',
    room: 'C1-404',
    time: '14:00 - 15:30',
    seatsLeft: 4,
  },
  {
    id: 4,
    title: 'Practical Mobile CI/CD',
    speaker: 'Pham Tuan Kiet',
    room: 'D1-302',
    time: '15:45 - 17:00',
    seatsLeft: 16,
  },
];

export default function WorkshopPage() {
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
                UniHub Workshops
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#211922] sm:text-4xl">
                Discover your next session
              </h1>
              <p className="mt-2 text-sm text-[#62625b] sm:text-base">
                Mock UI for workshop listing after successful authentication.
              </p>
            </div>

            <button
              className="rounded-2xl bg-[#e5e5e0] px-4 py-2 text-sm text-black transition hover:-translate-y-px hover:brightness-95"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workshops.map((workshop) => (
              <article
                key={workshop.id}
                className="flex flex-col gap-3 rounded-[20px] border border-[#91918c40] bg-linear-to-b from-[#f6f6f3] to-[#ffffff] p-4"
              >
                <div className="h-34 rounded-2xl bg-[linear-gradient(135deg,#e5e5e0,#f0efe9)]" />
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#211922]">
                  {workshop.title}
                </h2>
                <p className="text-sm text-[#62625b]">Speaker: {workshop.speaker}</p>
                <p className="text-sm text-[#62625b]">Room: {workshop.room}</p>
                <p className="text-sm text-[#62625b]">Time: {workshop.time}</p>

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="rounded-full bg-[hsla(60,20%,98%,.8)] px-2.5 py-1 text-xs text-[#62625b]">
                    {workshop.seatsLeft} seats left
                  </span>
                  <button className="rounded-2xl bg-[#e60023] px-3 py-2 text-xs text-white transition hover:-translate-y-px hover:brightness-95">
                    View detail
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
