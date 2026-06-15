"use client";

import { useState } from "react";

type Props = {
  onSuccess: (shortUrl: string) => void;
};

export default function ShortenForm({ onSuccess }: Props) {
  const [longUrl, setLongUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const response = await fetch("/api/urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: longUrl }),
    });

    if (!response.ok) {
      setError("Failed to shorten URL. Please try again.");
      setLongUrl("");
      return;
    }
    setError(null);
    const data = await response.json();
    onSuccess(data.shortUrl);
    setLongUrl("");
  }

  return (
    <>
      <h1>Generate your short URL.</h1>
      <form onSubmit={handleSubmit}>
        <input
          name='originalUrl'
          value={longUrl}
          onChange={e => setLongUrl(e.target.value)}
          placeholder='Your original URL'
        />
        <button type='submit'>Generate</button>
      </form>
      {error && <p>{error}</p>}
    </>
  );
}
