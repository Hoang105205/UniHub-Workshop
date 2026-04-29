"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
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

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) {
    return "Hold time will be announced.";
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.valueOf())) {
    return "Hold time will be announced.";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PendingRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage("");

    fetchMyPendingRegistrations()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setRegistrations(data);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load pending registrations.",
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

  const pendingTickets = useMemo(
    () => registrations.filter((item) => item.status === "pending"),
    [registrations],
  );

  return (
    <main>
      <section className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#211922]">
            Awaiting payment
          </h2>
          <p className="mt-2 text-sm text-[#62625b]">
            These seats are reserved for a limited time. Complete payment to
            confirm.
          </p>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-[#62625b]">Loading pending tickets...</p>
          ) : errorMessage ? (
            <p className="text-sm text-[#9e0a0a]">{errorMessage}</p>
          ) : pendingTickets.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[#91918c40] bg-[#f6f6f3] p-6 text-sm text-[#62625b]">
              No pending payments right now.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/registrations/${ticket.id}`}
                  className="rounded-[22px] border border-[#e6002340] bg-[linear-gradient(135deg,rgba(230,0,35,0.08),rgba(255,255,255,0.95))] p-4 transition hover:-translate-y-px"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-[#e6002340] bg-white px-2.5 py-1 font-semibold text-[#e60023]">
                      Pending payment
                    </span>
                    <span className="rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-2.5 py-1 text-[#62625b]">
                      {formatDateRange(
                        ticket.workshop.startTime,
                        ticket.workshop.endTime,
                      )}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold text-[#211922]">
                    {ticket.workshop.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#62625b]">
                    Hold expires at {formatExpiry(ticket.expiresAt)}
                  </p>
                  <div className="mt-3 inline-flex rounded-full border border-[#e6002340] bg-white px-3 py-1 text-xs font-semibold text-[#e60023]">
                    Open payment screen
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
