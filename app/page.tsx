"use client";

import { useState } from "react";
import ShortenForm from "@/app/frontend/components/ShortenForm";
import LinkResult from "@/app/frontend/components/LinkResult";
import LinkList from "@/app/frontend/components/LinkList";

export default function Home() {
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  function handleSuccess(url: string) {
    setShortUrl(url);
    setRefreshCount(c => c + 1);
  }

  return (
    <main className='min-h-screen bg-zinc-50'>
      <div className='max-w-screen-lg mx-auto px-4 py-8 md:px-6 space-y-6'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Snip</h1>
          <p className='text-sm text-zinc-500'>Shorten any URL in one click</p>
        </div>
        <ShortenForm onSuccess={handleSuccess} />
        <LinkResult shortUrl={shortUrl} />
        <LinkList key={refreshCount} />
      </div>
    </main>
  );
}
