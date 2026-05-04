"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchAdminWorkshops } from "@/lib/admin-workshops";
import type { WorkshopListItem } from "@/lib/workshops";

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

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(numericPrice)} VND`;
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 VND";
  }

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value)} VND`;
}

export default function AdminAnalyticsPage() {
  const [workshops, setWorkshops] = useState<WorkshopListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkshops = async () => {
    setLoading(true);

    try {
      const response = await fetchAdminWorkshops(1, 24);
      setWorkshops(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkshops();
  }, []);

  const summary = useMemo(() => {
    const totalWorkshops = workshops.length;
    const totalSeats = workshops.reduce((sum, item) => sum + item.capacity, 0);
    const totalRegistered = workshops.reduce(
      (sum, item) => sum + item.registeredCount,
      0,
    );
    const openSeats = workshops.reduce(
      (sum, item) => sum + Math.max(0, item.availableSeats),
      0,
    );
    const revenue = workshops.reduce((sum, item) => {
      const price = Number(item.price);
      if (!Number.isFinite(price) || price <= 0) {
        return sum;
      }
      return sum + price * item.registeredCount;
    }, 0);

    return {
      totalWorkshops,
      totalSeats,
      totalRegistered,
      openSeats,
      revenue,
    };
  }, [workshops]);

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-4xl border border-[#91918c4d] bg-[linear-gradient(135deg,#ffffff_0%,#f6f6f3_62%,#e5e5e0_100%)] p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
              Admin analyst desk
            </span>
            <h1 className="max-w-xl text-3xl font-bold tracking-[-0.04em] text-[#211922] sm:text-4xl lg:text-5xl">
              Track registrations, seats, and revenue trends in one place.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[#62625b] sm:text-base">
              Use this snapshot to monitor demand, spot workshops that need room changes, and launch new sessions when capacity runs tight.
            </p>
            
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <article className="rounded-3xl border border-[#91918c40] bg-white p-4">
              <p className="text-xs text-[#62625b]">Total workshops</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#211922]">
                {summary.totalWorkshops}
              </p>
              <p className="mt-1 text-xs text-[#62625b]">Sessions currently published</p>
            </article>
            <article className="rounded-3xl border border-[#91918c40] bg-[#f6f6f3] p-4">
              <p className="text-xs text-[#62625b]">Registrations</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#103c25]">
                {summary.totalRegistered}
              </p>
              <p className="mt-1 text-xs text-[#62625b]">Confirmed seats across all sessions</p>
            </article>
            <article className="rounded-3xl border border-[#91918c40] bg-white p-4">
              <p className="text-xs text-[#62625b]">Open seats</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#211922]">
                {summary.openSeats}
              </p>
              <p className="mt-1 text-xs text-[#62625b]">Availability left for students</p>
            </article>
            <article className="rounded-3xl border border-[#91918c40] bg-[#f6f6f3] p-4">
              <p className="text-xs text-[#62625b]">Projected revenue</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#211922]">
                {formatCurrency(summary.revenue)}
              </p>
              <p className="mt-1 text-xs text-[#62625b]">Based on current registrations</p>
            </article>
          </div>
        </div>
      </section>

      <section className="rounded-4xl border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
              Upcoming lineup
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[#211922]">
              Demand and schedule snapshot
            </h2>
          </div>

          <button
            className="rounded-2xl border border-[#91918c4d] bg-white px-4 py-2 text-xs font-semibold text-[#211922] transition hover:-translate-y-px hover:bg-[#f6f6f3]"
            onClick={() => void loadWorkshops()}
            type="button"
          >
            Refresh metrics
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-[#62625b]">Loading analytics...</p>
        ) : workshops.length === 0 ? (
          <p className="mt-6 text-sm text-[#62625b]">No workshops published yet.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workshops.map((workshop) => (
              <article
                key={workshop.id}
                className="rounded-3xl border border-[#91918c40] bg-[linear-gradient(180deg,#f6f6f3_0%,#ffffff_100%)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-2.5 py-1 text-[#62625b]">
                    {formatDateRange(workshop.startTime, workshop.endTime)}
                  </span>
                  <span className="rounded-full border border-[#103c2540] bg-[#103c2512] px-2.5 py-1 font-semibold text-[#103c25]">
                    {workshop.availableSeats} open
                  </span>
                  <span className="rounded-full border border-[#e6002340] bg-[#e6002312] px-2.5 py-1 font-semibold text-[#e60023]">
                    {formatPrice(workshop.price)}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold tracking-[-0.03em] text-[#211922]">
                  {workshop.title}
                </h3>
                <p className="mt-2 text-sm text-[#62625b] line-clamp-2">
                  {workshop.detail}
                </p>

                <div className="mt-3 grid gap-1 text-xs text-[#62625b]">
                  <span>
                    Seats filled: <span className="font-semibold text-[#211922]">{workshop.registeredCount} / {workshop.capacity}</span>
                  </span>
                  <span>
                    Speaker: <span className="font-semibold text-[#211922]">{workshop.speaker}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
