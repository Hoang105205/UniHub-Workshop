"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchRegistrationDetail,
  RegistrationListItem,
  cancelRegistration,
} from "@/lib/registrations";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

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

const statusLabel: Record<string, string> = {
  pending: "Pending payment",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  cancelled: "Cancelled",
};

const statusStyles: Record<string, string> = {
  pending: "border-[#e6002340] bg-[#e6002312] text-[#e60023]",
  confirmed: "border-[#103c2540] bg-[#103c2512] text-[#103c25]",
  checked_in: "border-[#435ee540] bg-[#435ee512] text-[#435ee5]",
  cancelled: "border-[#9e0a0a40] bg-[#9e0a0a12] text-[#9e0a0a]",
};

export default function RegistrationDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const registrationId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [registration, setRegistration] = useState<RegistrationListItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!registrationId) {
      setErrorMessage("Registration not found.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMessage("");

    fetchRegistrationDetail(registrationId)
      .then((item) => {
        if (!isMounted) {
          return;
        }
        setRegistration(item);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load registration details.",
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
  }, [registrationId]);

  return (
    <main>
      <section className="rounded-[28px] border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
        {loading ? (
          <p className="text-sm text-[#62625b]">Loading ticket...</p>
        ) : errorMessage ? (
          <div>
            <p className="text-sm text-[#9e0a0a]">{errorMessage}</p>
            <Link
              className="mt-4 inline-flex rounded-2xl border border-[#91918c4d] px-4 py-2 text-xs text-[#211922]"
              href="/registrations/confirm"
            >
              Back to tickets
            </Link>
          </div>
        ) : registration ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-2.5 py-1 text-[#62625b]">
                {formatDateRange(
                  registration.workshop.startTime,
                  registration.workshop.endTime,
                )}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 font-semibold ${
                  statusStyles[registration.status] ||
                  "border-[#91918c40] bg-[#f6f6f3] text-[#62625b]"
                }`}
              >
                {statusLabel[registration.status] || registration.status}
              </span>
              <span className="rounded-full border border-[#e6002340] bg-[#e6002312] px-2.5 py-1 font-semibold text-[#e60023]">
                {formatPrice(registration.workshop.price)}
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#211922]">
                  {registration.workshop.title}
                </h2>
                <p className="text-sm text-[#62625b]">
                  Room {registration.workshop.room} · Speaker{" "}
                  {registration.workshop.speaker}
                </p>

                {registration.status === "pending" ? (
                  <div className="rounded-[20px] border border-[#e6002340] bg-[linear-gradient(135deg,rgba(230,0,35,0.08),rgba(255,255,255,0.95))] p-4">
                    <span className="inline-flex rounded-full border border-[#e6002340] bg-white px-2.5 py-1 text-xs font-semibold text-[#e60023]">
                      Payment required
                    </span>
                    <p className="mt-3 text-sm font-semibold text-[#211922]">
                      Hold expires at {formatExpiry(registration.expiresAt)}
                    </p>
                    <p className="mt-2 text-sm text-[#62625b]">
                      Complete payment soon to secure your seat.
                    </p>
                  </div>
                ) : registration.status === "confirmed" ? (
                  <div className="rounded-[20px] border border-[#103c2540] bg-[#103c2512] p-4">
                    <span className="inline-flex rounded-full border border-[#103c2540] bg-white px-2.5 py-1 text-xs font-semibold text-[#103c25]">
                      QR code
                    </span>
                    <div className="p-4 bg-white border-2 border-gray-100 rounded-xl">
                      <QRCodeSVG
                        value={registration.qrCode} // Ví dụ: "WS-1714896000000-a1b2c3d4"
                        size={200}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"H"} // Error correction level H: Cho phép QR bị che/rách 30% vẫn đọc được
                      />
                    </div>
                    <p className="mt-2 text-sm text-[#62625b]">
                      Show this QR code during check-in.
                    </p>
                  </div>
                ) : null}
              </div>

              <aside className="rounded-[20px] border border-[#91918c40] bg-linear-to-b from-[#f6f6f3] to-[#ffffff] p-4">
                <h3 className="text-lg font-semibold text-[#211922]">
                  Next actions
                </h3>
                <div className="mt-4 space-y-3 text-sm text-[#62625b]">
                  {registration.status === "pending" ? (
                    <div className="flex w-full flex-col gap-2 mt-4">
                      {" "}
                      {/* Đã thay <> bằng div và thêm class */}
                      <Link
                        className="w-full rounded-2xl bg-[#e60023] px-4 py-2.5 text-center text-xs text-white transition hover:-translate-y-px hover:brightness-95"
                        href={`/registrations/${registration.id}/payment`}
                      >
                        Pay now
                      </Link>
                      <button
                        className="w-full rounded-2xl border border-[#91918c4d] px-4 py-2 text-xs text-[#211922]"
                        onClick={async () => {
                          if (!registration) return;
                          setCancelling(true);
                          try {
                            await cancelRegistration(registration.id);
                            toast.success("Registration cancelled.");
                            router.push("/registrations/confirm");
                          } catch (err: any) {
                            toast.error(err?.message || "Cancel failed");
                          } finally {
                            setCancelling(false);
                          }
                        }}
                        disabled={cancelling}
                      >
                        {cancelling ? "Cancelling..." : "Cancel registration"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[#62625b]">
                      Your ticket is confirmed. Keep this page for reference.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
