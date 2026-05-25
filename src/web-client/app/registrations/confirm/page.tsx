"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchMyConfirmedRegistrations,
  fetchMyPendingRegistrations,
  RegistrationListItem,
} from "@/lib/registrations";

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

const statusBadgeStyles: Record<string, string> = {
  confirmed: "border-[#103c2540] bg-[#103c2512] text-[#103c25]",
  checked_in: "border-[#435ee540] bg-[#435ee512] text-[#435ee5]",
  cancelled: "border-[#9e0a0a40] bg-[#9e0a0a12] text-[#9e0a0a]",
};

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationListItem[]>(
    [],
  );
  const [pendingRegistrations, setPendingRegistrations] = useState<
    RegistrationListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage("");

    Promise.all([
      fetchMyConfirmedRegistrations(),
      fetchMyPendingRegistrations(),
    ])
      .then(([confirmed, pending]) => {
        if (!isMounted) {
          return;
        }
        setRegistrations(confirmed);
        setPendingRegistrations(pending);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load registrations.",
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
  }, []);

  const pendingCount = useMemo(
    () => pendingRegistrations.length,
    [pendingRegistrations],
  );

  return (
    <main>
      <section className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#211922]">
              Tickets overview
            </h2>
            <p className="mt-2 text-sm text-[#62625b]">
              Keep track of confirmed seats and workshop dates.
            </p>
          </div>
          {pendingCount > 0 ? (
            <Link
              className="rounded-2xl border border-[#e6002340] bg-[#e6002312] px-4 py-2 text-xs font-semibold text-[#e60023]"
              href="/registrations/pending"
            >
              {pendingCount} payment pending
            </Link>
          ) : null}
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-[#62625b]">Loading tickets...</p>
          ) : errorMessage ? (
            <p className="text-sm text-[#9e0a0a]">{errorMessage}</p>
          ) : registrations.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[#91918c40] bg-[#f6f6f3] p-6 text-sm text-[#62625b]">
              No confirmed tickets yet. Explore workshops to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {registrations.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/registrations/${ticket.id}`}
                  className="group rounded-[22px] border border-[#91918c40] bg-white p-4 transition hover:-translate-y-px hover:border-[#211922]"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-2.5 py-1 text-[#62625b]">
                      {formatDateRange(
                        ticket.workshop.startTime,
                        ticket.workshop.endTime,
                      )}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 font-semibold ${
                        statusBadgeStyles[ticket.status] ||
                        "border-[#91918c40] bg-[#f6f6f3] text-[#62625b]"
                      }`}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className="rounded-full border border-[#e6002340] bg-[#e6002312] px-2.5 py-1 font-semibold text-[#e60023]">
                      {formatPrice(ticket.workshop.price)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold text-[#211922]">
                    {ticket.workshop.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#62625b]">
                    Room {ticket.workshop.room} · Speaker{" "}
                    {ticket.workshop.speaker}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
