"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthShell from "../auth-shell";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const { user } = await register({
        studentId,
        email,
        password,
      });
      // Navigate based on user role
      const redirectPath = user.role === "admin" ? "/admin" : "/workshops";
      router.push(redirectPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create account right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Register with your university profile"
      subtitle="Use student ID + email preloaded by CSV import."
    >
      <div className="w-full max-w-md rounded-4xl border border-[#91918c4d] bg-white/90 p-6 shadow-[0_8px_30px_rgba(33,25,34,0.08)] backdrop-blur-sm">
        <h1 className="text-[1.65rem] font-bold tracking-[-0.03em]">
          Register
        </h1>
        <p className="mt-1.5 text-[#62625b]">
          Password needs uppercase, lowercase, and number.
        </p>

        <form onSubmit={onSubmit} className="mt-4">
          <div className="mt-3 flex flex-col gap-2">
            <label className="text-sm font-bold" htmlFor="studentId">
              Student ID
            </label>
            <input
              className="rounded-2xl border border-[#91918c] bg-white px-4 py-2.5 text-[0.95rem] text-[#211922] outline-none focus:border-[#435ee5] focus:ring-3 focus:ring-[#435ee533]"
              id="studentId"
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="text-sm font-bold" htmlFor="email">
              Email
            </label>
            <input
              className="rounded-2xl border border-[#91918c] bg-white px-4 py-2.5 text-[0.95rem] text-[#211922] outline-none focus:border-[#435ee5] focus:ring-3 focus:ring-[#435ee533]"
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="text-sm font-bold" htmlFor="password">
              Password
            </label>
            <input
              className="rounded-2xl border border-[#91918c] bg-white px-4 py-2.5 text-[0.95rem] text-[#211922] outline-none focus:border-[#435ee5] focus:ring-3 focus:ring-[#435ee533]"
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {errorMessage ? (
            <p className="mt-3 text-sm text-[#9e0a0a]">{errorMessage}</p>
          ) : null}

          <button
            className="mt-4 w-full rounded-2xl bg-[#e60023] px-4 py-2.5 text-sm text-white transition hover:-translate-y-px hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm">
          Already registered?{" "}
          <Link className="underline" href="/auth/login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
