"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthShell from "../auth-shell";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const { user } = await login(email, password);
      // Navigate based on user role
      const redirectPath = user.role === "admin" ? "/admin" : "/workshops";
      router.push(redirectPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in and continue your workshop journey"
      subtitle="A warm, focused space for student and admin access."
    >
      <div className="w-full max-w-md rounded-4xl border border-[#91918c4d] bg-white/90 p-6 shadow-[0_8px_30px_rgba(33,25,34,0.08)] backdrop-blur-sm">
        <h1 className="text-[1.65rem] font-bold tracking-[-0.03em]">Login</h1>

        <form onSubmit={onSubmit} className="mt-4">
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-sm">
          No account yet?{" "}
          <Link className="underline" href="/auth/register">
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
