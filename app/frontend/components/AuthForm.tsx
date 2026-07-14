"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractApiErrorMessage } from "@/lib/utils";

type Props = {
  action: string;
  submitLabel: string;
  pendingLabel: string;
  fallbackError: string;
};

export default function AuthForm({ action, submitLabel, pendingLabel, fallbackError }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(extractApiErrorMessage(data.error, fallbackError));
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-1'>
        <label htmlFor='email' className='text-sm font-medium text-zinc-700'>
          Email
        </label>
        <input
          id='email'
          name='email'
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className='w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20'
        />
      </div>
      <div className='space-y-1'>
        <label htmlFor='password' className='text-sm font-medium text-zinc-700'>
          Password
        </label>
        <input
          id='password'
          name='password'
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className='w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20'
        />
        {error && <p className='text-sm text-red-600'>{error}</p>}
      </div>
      <button
        type='submit'
        disabled={loading}
        className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50'
      >
        {loading ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
