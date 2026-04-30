"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { fetchAdminWorkshopDetail, fetchAdminWorkshops, createWorkshop, updateWorkshop, deleteWorkshop } from "@/lib/admin-workshops";
import type { WorkshopListItem } from "@/lib/workshops";

type WorkshopFormState = {
  title: string;
  speaker: string;
  room: string;
  capacity: string;
  price: string;
  startTime: string;
  endTime: string;
  detail: string;
};

const emptyForm: WorkshopFormState = {
  title: "",
  speaker: "",
  room: "",
  capacity: "",
  price: "0",
  startTime: "",
  endTime: "",
  detail: "",
};

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

function toInputValue(value?: string | Date) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  const pad = (numberValue: number) => String(numberValue).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toUtcIso(value: string) {
  return new Date(value).toISOString();
}

export default function AdminPage() {
  const [workshops, setWorkshops] = useState<WorkshopListItem[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<WorkshopFormState>(emptyForm);
  const [introFile, setIntroFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");

  const selectedWorkshop = useMemo(
    () => workshops.find((workshop) => workshop.id === selectedWorkshopId) || null,
    [selectedWorkshopId, workshops],
  );

  const filteredWorkshops = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return workshops;
    }

    return workshops.filter((workshop) =>
      [workshop.title, workshop.room, workshop.speaker]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [searchText, workshops]);

  const loadWorkshops = async () => {
    setLoading(true);

    try {
      const response = await fetchAdminWorkshops(1, 24);
      setWorkshops(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load workshops.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkshops();
  }, []);

  useEffect(() => {
    if (!selectedWorkshop) {
      return;
    }

    let active = true;
    setFetchingDetail(true);

    fetchAdminWorkshopDetail(selectedWorkshop.id)
      .then((detail) => {
        if (!active) {
          return;
        }

        setForm({
          title: detail.title,
          speaker: detail.speaker,
          room: detail.room,
          capacity: String(detail.capacity),
          price: String(detail.price),
          startTime: toInputValue(detail.startTime),
          endTime: toInputValue(detail.endTime),
          detail: detail.detail,
        });
        setIntroFile(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        toast.error(error instanceof Error ? error.message : "Unable to load workshop detail.");
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setFetchingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [selectedWorkshop]);

  const resetForm = () => {
    setSelectedWorkshopId(null);
    setForm(emptyForm);
    setIntroFile(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("speaker", form.speaker.trim());
      payload.append("room", form.room.trim());
      payload.append("capacity", form.capacity);
      payload.append("price", form.price || "0");
      payload.append("startTime", toUtcIso(form.startTime));
      payload.append("endTime", toUtcIso(form.endTime));
      payload.append("detail", form.detail.trim());

      if (introFile) {
        payload.append("introDocument", introFile);
      }

      if (selectedWorkshopId) {
        await updateWorkshop(selectedWorkshopId, payload);
        toast.success("Workshop updated. AI summary will refresh if PDF is attached.");
      } else {
        await createWorkshop(payload);
        toast.success("Workshop created.");
      }

      await loadWorkshops();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save workshop.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this workshop? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      await deleteWorkshop(id);
      toast.success("Workshop deleted.");
      if (selectedWorkshopId === id) {
        resetForm();
      }
      await loadWorkshops();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete workshop.");
    }
  };

  const openSeats = workshops.reduce(
    (sum, workshop) => sum + Math.max(0, workshop.availableSeats),
    0,
  );

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-4xl border border-[#91918c4d] bg-[linear-gradient(135deg,#ffffff_0%,#f6f6f3_62%,#e5e5e0_100%)] p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
              Admin workshop studio
            </span>
            <h1 className="max-w-xl text-3xl font-bold tracking-[-0.04em] text-[#211922] sm:text-4xl lg:text-5xl">
              Create, reshape, and publish workshops with a warm editorial feel.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[#62625b] sm:text-base">
              Organizers can create new sessions, move rooms or times, upload an introduction PDF, and let the AI worker draft the summary shown on workshop detail pages.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                className="rounded-2xl bg-[#e60023] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(230,0,35,0.25)] transition hover:-translate-y-px hover:brightness-95"
                onClick={resetForm}
                type="button"
              >
                New workshop
              </button>
              <button
                className="rounded-2xl border border-[#91918c4d] bg-white px-4 py-2 text-xs font-semibold text-[#211922] transition hover:-translate-y-px hover:bg-[#f6f6f3]"
                onClick={() => void loadWorkshops()}
                type="button"
              >
                Refresh list
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <article className="rounded-3xl border border-[#91918c40] bg-white p-4">
              <p className="text-xs text-[#62625b]">Upcoming workshops</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#211922]">
                {workshops.length}
              </p>
              <p className="mt-1 text-xs text-[#62625b]">Live sessions in the queue</p>
            </article>
            <article className="rounded-3xl border border-[#91918c40] bg-[#f6f6f3] p-4">
              <p className="text-xs text-[#62625b]">Open seats</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#103c25]">
                {openSeats}
              </p>
              <p className="mt-1 text-xs text-[#62625b]">Across upcoming workshops</p>
            </article>
            <article className="rounded-3xl border border-[#91918c40] bg-white p-4">
              <p className="text-xs text-[#62625b]">Mode</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#211922]">
                {selectedWorkshopId ? "Editing" : "Creating"}
              </p>
              <p className="mt-1 text-xs text-[#62625b]">
                {selectedWorkshopId ? "Current item loaded" : "Fresh form ready"}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          className="rounded-4xl border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-6"
          onSubmit={onSubmit}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
                Workshop editor
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[#211922]">
                {selectedWorkshopId ? "Update workshop" : "Create workshop"}
              </h2>
            </div>

            {fetchingDetail ? (
              <span className="rounded-full border border-[#91918c4d] bg-[#f6f6f3] px-3 py-1 text-xs text-[#62625b]">
                Loading detail...
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-[#62625b] sm:col-span-2">
              Title
              <input
                className="rounded-2xl border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition placeholder:text-[#91918c] focus:border-[#435ee5]"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Kỹ năng lập trình NestJS chuyên sâu"
                value={form.title}
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b]">
              Speaker
              <input
                className="rounded-2xl border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition placeholder:text-[#91918c] focus:border-[#435ee5]"
                onChange={(event) => setForm((current) => ({ ...current, speaker: event.target.value }))}
                placeholder="Nguyễn Văn A"
                value={form.speaker}
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b]">
              Room
              <input
                className="rounded-2xl border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition placeholder:text-[#91918c] focus:border-[#435ee5]"
                onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
                placeholder="A.101"
                value={form.room}
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b]">
              Capacity
              <input
                className="rounded-2xl border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition placeholder:text-[#91918c] focus:border-[#435ee5]"
                min={1}
                onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                placeholder="60"
                type="number"
                value={form.capacity}
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b]">
              Price
              <input
                className="rounded-2xl border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition placeholder:text-[#91918c] focus:border-[#435ee5]"
                min={0}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                placeholder="0"
                type="number"
                value={form.price}
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b]">
              Intro PDF
              <input
                className="rounded-2xl border border-dashed border-[#91918c] bg-[hsla(60,20%,98%,.5)] px-4 py-3 text-sm text-[#62625b] file:mr-4 file:rounded-full file:border-0 file:bg-[#e5e5e0] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#211922]"
                accept="application/pdf"
                onChange={(event) => setIntroFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b]">
              Start time
              <input
                className="rounded-2xl border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition focus:border-[#435ee5]"
                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                type="datetime-local"
                value={form.startTime}
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b]">
              End time
              <input
                className="rounded-2xl border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition focus:border-[#435ee5]"
                onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                type="datetime-local"
                value={form.endTime}
              />
            </label>

            <label className="grid gap-2 text-sm text-[#62625b] sm:col-span-2">
              Detail
              <textarea
                className="min-h-40 rounded-[20px] border border-[#91918c] bg-white px-4 py-3 text-[#211922] outline-none transition placeholder:text-[#91918c] focus:border-[#435ee5]"
                onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))}
                placeholder="Mô tả ngắn về workshop, khách mời, agenda, và nội dung AI tóm tắt"
                value={form.detail}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#91918c26] pt-4">
            <div className="text-xs text-[#62625b]">
              {selectedWorkshopId ? `Editing workshop ${selectedWorkshopId}` : "Creating a brand-new workshop"}
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedWorkshopId ? (
                <button
                  className="rounded-2xl border border-[#91918c4d] bg-white px-4 py-2 text-xs font-semibold text-[#211922] transition hover:-translate-y-px hover:bg-[#f6f6f3]"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
              <button
                className="rounded-2xl bg-[#e60023] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(230,0,35,0.25)] transition hover:-translate-y-px hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving..." : selectedWorkshopId ? "Update workshop" : "Create workshop"}
              </button>
            </div>
          </div>
        </form>

        <section className="rounded-4xl border border-[#91918c4d] bg-white p-5 shadow-[0_8px_30px_rgba(33,25,34,0.08)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="w-fit rounded-full border border-[#91918c4d] bg-[hsla(60,20%,98%,.5)] px-3 py-1 text-xs text-[#62625b]">
                Workshop library
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[#211922]">
                Browse and manage sessions
              </h2>
            </div>

            <label className="grid gap-2 text-xs text-[#62625b]">
              Search
              <input
                className="rounded-full border border-[#91918c] bg-white px-4 py-2 text-sm text-[#211922] outline-none transition focus:border-[#435ee5]"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Title, speaker, room"
                value={searchText}
              />
            </label>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[#62625b]">Loading workshops...</p>
          ) : filteredWorkshops.length === 0 ? (
            <p className="mt-6 text-sm text-[#62625b]">No workshop matches your search yet.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {filteredWorkshops.map((workshop) => {
                const isActive = workshop.id === selectedWorkshopId;

                return (
                  <article
                    key={workshop.id}
                    className={`rounded-3xl border p-4 transition ${
                      isActive
                        ? "border-[#e6002350] bg-[#e6002308]"
                        : "border-[#91918c40] bg-[linear-gradient(180deg,#f6f6f3_0%,#ffffff_100%)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
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

                        <h3 className="text-lg font-bold tracking-[-0.03em] text-[#211922]">
                          {workshop.title}
                        </h3>
                        <p className="text-sm text-[#62625b] line-clamp-2">
                          {workshop.detail}
                        </p>

                        <div className="grid gap-1 text-sm text-[#62625b]">
                          <span>
                            Speaker: <span className="font-semibold text-[#211922]">{workshop.speaker}</span>
                          </span>
                          <span>
                            Room: <span className="font-semibold text-[#211922]">{workshop.room}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        className="rounded-full border border-[#91918c4d] bg-white px-3 py-1.5 text-xs font-semibold text-[#211922] transition hover:-translate-y-px hover:bg-[#f6f6f3]"
                        onClick={() => setSelectedWorkshopId(workshop.id)}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#91918c26] pt-4">
                      <span className="text-xs text-[#62625b]">
                        Seats: <span className="font-semibold text-[#211922]">{workshop.availableSeats} / {workshop.capacity}</span>
                      </span>
                      <button
                        className="rounded-2xl bg-[#e5e5e0] px-3 py-2 text-xs font-semibold text-black transition hover:-translate-y-px hover:brightness-95"
                        onClick={() => void onDelete(workshop.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
