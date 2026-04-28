"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { fetchWorkshops, WorkshopListItem } from "@/lib/workshops";

const PAGE_SIZE = 9;

const studentTabs = [
  { label: "Explore", id: "explore" },
  { label: "Awaiting payment", id: "awaiting-payment" },
  { label: "My tickets", id: "my-tickets" },
];

function formatDateRange(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return "Schedule to be announced";
  }

  const day = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const startClock = start.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endClock = end.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${day} · ${startClock} - ${endClock}`;
}

function formatPrice(price: string) {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return "Free";
  }

  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(numericPrice);

  return `${formatted} VND`;
}

export default function WorkshopPage() {
  const router = useRouter();
  const [workshops, setWorkshops] = useState<WorkshopListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const activeTabId = "explore";

  const onLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage("");

    fetchWorkshops(page, PAGE_SIZE)
      .then((response) => {
        if (!isMounted) {
          return;
        }
        setWorkshops(response.data);
        setTotalPages(response.meta.totalPages);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load workshops right now.",
        );
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
                Workshop Directory
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#211922] sm:text-4xl">
                Explore upcoming sessions
              </h1>
              <p className="mt-2 text-sm text-[#62625b] sm:text-base">
                Browse live workshops, track availability, and plan your
                schedule.
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
            {studentTabs.map((tab) => (
              <button
                key={tab.id}
                className={`rounded-full border px-4 py-2 text-xs transition ${
                  tab.id === activeTabId
                    ? "border-[#211922] bg-[#211922] text-white"
                    : "border-[#91918c4d] bg-white text-[#211922] hover:-translate-y-px"
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <section className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#211922]">
              Available workshops
            </h2>
            <span className="text-xs text-[#62625b]">
              Page {page} of {totalPages}
            </span>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[#62625b]">Loading workshops...</p>
          ) : errorMessage ? (
            <p className="mt-6 text-sm text-[#9e0a0a]">{errorMessage}</p>
          ) : workshops.length === 0 ? (
            <p className="mt-6 text-sm text-[#62625b]">
              No workshops available yet.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workshops.map((workshop) => (
                <article
                  key={workshop.id}
                  className="flex h-full flex-col gap-3 rounded-[20px] border border-[#91918c40] bg-linear-to-b from-[#f6f6f3] to-[#ffffff] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-2.5 py-1 text-[#62625b]">
                      {formatDateRange(workshop.startTime, workshop.endTime)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 font-semibold ${
                        Number(workshop.price) > 0
                          ? "border-[#e6002340] bg-[#e6002312] text-[#e60023]"
                          : "border-[#103c2540] bg-[#103c2512] text-[#103c25]"
                      }`}
                    >
                      {formatPrice(workshop.price)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 font-semibold ${
                        workshop.availableSeats > 0
                          ? "border-[#103c2540] bg-[#103c2512] text-[#103c25]"
                          : "border-[#9e0a0a40] bg-[#9e0a0a12] text-[#9e0a0a]"
                      }`}
                    >
                      {workshop.availableSeats > 0 ? "Open seats" : "Sold out"}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#211922]">
                    {workshop.title}
                  </h3>
                  <p className="text-sm text-[#62625b]">
                    {workshop.detail.length > 120
                      ? `${workshop.detail.slice(0, 120)}...`
                      : workshop.detail}
                  </p>

                  <div className="grid gap-1 text-sm text-[#62625b]">
                    <span>
                      Speaker:{" "}
                      <span className="font-semibold text-[#211922]">
                        {workshop.speaker}
                      </span>
                    </span>
                    <span>
                      Room:{" "}
                      <span className="font-semibold text-[#211922]">
                        {workshop.room}
                      </span>
                    </span>
                    <span>
                      Seats:
                      <span className="ml-1 font-semibold text-[#211922]">
                        {workshop.availableSeats} / {workshop.capacity}
                      </span>
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="rounded-full bg-[hsla(60,20%,98%,.8)] px-2.5 py-1 text-xs text-[#62625b]">
                      {workshop.availableSeats > 0
                        ? `${workshop.availableSeats} seats left`
                        : "Fully booked"}
                    </span>
                    <Link
                      className="rounded-2xl bg-[#e60023] px-3 py-2 text-xs text-white transition hover:-translate-y-px hover:brightness-95"
                      href={`/workshops/${workshop.id}`}
                    >
                      View detail
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#91918c26] pt-4 text-sm">
            <button
              className="rounded-2xl bg-[#e5e5e0] px-3 py-2 text-xs text-black transition hover:-translate-y-px hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </button>
            <span className="text-xs text-[#62625b]">
              Showing page {page} of {totalPages}
            </span>
            <button
              className="rounded-2xl bg-[#e5e5e0] px-3 py-2 text-xs text-black transition hover:-translate-y-px hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || loading}
            >
              Next
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
