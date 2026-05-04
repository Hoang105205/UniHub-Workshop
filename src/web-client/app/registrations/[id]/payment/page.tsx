"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchRegistrationDetail,
  RegistrationListItem,
  chargeRegistration,
  cancelRegistration,
} from "@/lib/registrations";
import { toast } from "sonner";

export default function PaymentConfirmPage() {
  const params = useParams<{ id?: string | string[] }>();
  const registrationId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const router = useRouter();

  const [registration, setRegistration] = useState<RegistrationListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!registrationId) return;

    let isMounted = true;
    setLoading(true);
    fetchRegistrationDetail(registrationId)
      .then((r) => {
        if (!isMounted) return;
        setRegistration(r);
      })
      .catch((err) => {
        toast.error(err.message || "Unable to load");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [registrationId, toast]);

  useEffect(() => {
    if (!registrationId) return;
    const key = window.localStorage.getItem(`registration:${registrationId}:idempotencyKey`);
    if (key) setIdempotencyKey(key);
  }, [registrationId]);

  function ensureIdempotencyKey() {
    if (idempotencyKey) return idempotencyKey;
    const key = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    setIdempotencyKey(key);
    if (registrationId) {
      window.localStorage.setItem(`registration:${registrationId}:idempotencyKey`, key);
    }
    return key;
  }

  async function handlePay() {
    if (!registrationId) return;
    const key = ensureIdempotencyKey();
    setProcessing(true);
    try {
      await chargeRegistration(registrationId, key);
      toast.info("Payment is being processed.");
      router.push(`/registrations/${registrationId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to process payment');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    if (!registrationId) return;
    setProcessing(true);
    try {
      await cancelRegistration(registrationId);
      toast.success("Registration cancelled.");
      router.push('/registrations/confirm');
    } catch (err: any) {
      const msg = err?.message || 'Unable to cancel registration';
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <p className="text-sm text-[#62625b]">Loading...</p>;

  if (!registration)
    return (
      <div>
        <p className="text-sm text-[#9e0a0a]">Registration not found.</p>
      </div>
    );

  const amount = registration.workshop.price;

  return (
    <main>
      <section className="rounded-[20px] border p-6">
        <h2 className="text-xl font-semibold">Confirm Payment</h2>
        <p className="mt-2 text-sm text-[#62625b]">Workshop: {registration.workshop.title}</p>
        <p className="mt-1 text-sm text-[#62625b]">Payer: You</p>
        <p className="mt-1 text-sm font-semibold">Amount: {Number(amount) > 0 ? `${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Number(amount))} VND` : 'Free'}</p>

        <div className="mt-6 flex gap-3">
          <button
            className="rounded-2xl bg-[#e60023] px-4 py-2 text-xs text-white"
            onClick={handlePay}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Pay now'}
          </button>

          <button
            className="rounded-2xl border px-4 py-2 text-xs"
            onClick={() => router.back()}
            disabled={processing}
          >
            Back
          </button>

          <button
            className="rounded-2xl border px-4 py-2 text-xs"
            onClick={handleCancel}
            disabled={processing}
          >
            Cancel registration
          </button>
        </div>
      </section>
    </main>
  );
}
