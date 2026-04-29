"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchProfile, logout } from "@/lib/auth";
import { fetchWorkshopDetail, WorkshopDetailResponse } from "@/lib/workshops";

interface ProfileSummary {
  id: string;
  fullName: string;
  email: string;
  role: string;
  studentId: string;
}

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

export default function WorkshopConfirmPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const workshopId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [workshop, setWorkshop] = useState<WorkshopDetailResponse | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const onLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  useEffect(() => {
    if (!workshopId) {
      setErrorMessage("Workshop not found.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMessage("");

    Promise.all([fetchWorkshopDetail(workshopId), fetchProfile()])
      .then(([workshopResponse, profileResponse]) => {
        if (!isMounted) {
          return;
        }
        setWorkshop(workshopResponse);
        setProfile(profileResponse);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load confirmation details.",
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
  }, [workshopId]);

  const isPaid = workshop ? Number(workshop.price) > 0 : false;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
                Registration confirmation
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#211922] sm:text-4xl">
                Confirm your registration
              </h1>
              <p className="mt-2 text-sm text-[#62625b] sm:text-base">
                Review details carefully before submitting your registration.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                className="rounded-2xl border border-[#91918c4d] px-4 py-2 text-xs text-[#211922] transition hover:-translate-y-px"
                href={`/workshops/${workshopId}`}
              >
                Back to details
              </Link>
              <button
                className="rounded-2xl bg-[#e5e5e0] px-4 py-2 text-xs text-black transition hover:-translate-y-px hover:brightness-95"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
          {loading ? (
            <p className="text-sm text-[#62625b]">Loading confirmation...</p>
          ) : errorMessage ? (
            <p className="text-sm text-[#9e0a0a]">{errorMessage}</p>
          ) : workshop && profile ? (
            <div className="flex flex-col gap-6">
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
                {workshop.hasTicket ? (
                  <span className="rounded-full border border-[#103c2540] bg-[#103c2512] px-2.5 py-1 font-semibold text-[#103c25]">
                    Ticket purchased
                  </span>
                ) : null}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#211922]">
                    Workshop summary
                  </h2>
                  <p className="text-base leading-relaxed text-[#62625b]">
                    {workshop.detail}
                  </p>

                  <div className="rounded-[20px] border border-[#e6002340] bg-[linear-gradient(135deg,rgba(230,0,35,0.08),rgba(255,255,255,0.9))] p-4">
                    <span className="inline-flex items-center rounded-full border border-[#e6002340] bg-white px-2.5 py-1 text-xs font-semibold text-[#e60023]">
                      Important notice
                    </span>
                    <p className="mt-3 text-sm font-semibold text-[#211922]">
                      {isPaid
                        ? "This workshop requires payment. After you confirm, you will proceed to the payment step."
                        : "This workshop is free. After you confirm, your registration will be completed instantly."}
                    </p>
                  </div>
                </div>

                <aside className="rounded-[20px] border border-[#91918c40] bg-linear-to-b from-[#f6f6f3] to-[#ffffff] p-4">
                  <h3 className="text-lg font-semibold text-[#211922]">
                    Attendee details
                  </h3>
                  <div className="mt-4 grid gap-2 text-sm text-[#62625b]">
                    <span>
                      Name:{" "}
                      <span className="font-semibold text-[#211922]">
                        {profile.fullName}
                      </span>
                    </span>
                    <span>
                      Email:{" "}
                      <span className="font-semibold text-[#211922]">
                        {profile.email}
                      </span>
                    </span>
                    <span>
                      Student ID:{" "}
                      <span className="font-semibold text-[#211922]">
                        {profile.studentId}
                      </span>
                    </span>
                  </div>

                  <div className="mt-6 rounded-[20px] border border-[#91918c40] bg-white p-4">
                    <h4 className="text-sm font-semibold text-[#211922]">
                      Workshop details
                    </h4>
                    <div className="mt-3 grid gap-2 text-sm text-[#62625b]">
                      <span>
                        Speaker:
                        <span className="ml-1 font-semibold text-[#211922]">
                          {workshop.speaker}
                        </span>
                      </span>
                      <span>
                        Room:
                        <span className="ml-1 font-semibold text-[#211922]">
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
                  </div>

                  <div className="mt-6 flex flex-col gap-2">
                    <Link
                      className="w-full rounded-2xl border border-[#91918c4d] px-4 py-2 text-center text-xs text-[#211922] transition hover:-translate-y-px"
                      href={`/workshops/${workshop.id}`}
                    >
                      Cancel
                    </Link>
                    <button
                      className="w-full rounded-2xl bg-[#e60023] px-4 py-2.5 text-xs text-white transition hover:-translate-y-px hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={workshop.hasTicket}
                    >
                      {workshop.hasTicket ? "Already registered" : "Confirm"}
                    </button>
                    {workshop.hasTicket ? (
                      <p className="text-xs text-[#62625b]">
                        You already own a ticket for this workshop.
                      </p>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
