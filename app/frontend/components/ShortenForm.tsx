"use client";

import { useState } from "react";
import { validateUrlToShorten } from "@/lib/utils";

type Props = {
  onSuccess: (shortUrl: string) => void;
};

export default function ShortenForm({ onSuccess }: Props) {
  const [longUrl, setLongUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validateUrlToShorten(longUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    const response = await fetch("/api/urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: longUrl.trim() }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("Failed to shorten URL. Please check the URL and try again.");
      return;
    }
    const data = await response.json();
    onSuccess(data.shortUrl);
    setLongUrl("");
  }

  return (
    <div className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm'>
      <h2 className='mb-4 text-2xl font-semibold tracking-tight text-zinc-900'>Shorten a URL</h2>
      <form onSubmit={handleSubmit} noValidate className='space-y-4'>
        <div className='space-y-1'>
          <label htmlFor='originalUrl' className='text-sm font-medium text-zinc-700'>
            Paste your full URL
          </label>
          <input
            id='originalUrl'
            name='originalUrl'
            type='url'
            inputMode='url'
            value={longUrl}
            onChange={e => {
              setLongUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder='https://example.com/very/long/url'
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "originalUrl-error" : undefined}
            className='w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20'
          />
          {error && (
            <p id='originalUrl-error' className='text-sm text-red-600'>
              {error}
            </p>
          )}
        </div>
        <button
          type='submit'
          disabled={loading}
          className='inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50'
        >
          {loading ? "Shortening…" : "Shorten"}
        </button>
      </form>
    </div>
  );
}
