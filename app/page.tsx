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
    <main className='min-h-screen bg-zinc-50 dark:bg-zinc-900'>
      <ShortenForm onSuccess={handleSuccess} />
      <LinkResult shortUrl={shortUrl} />
      <LinkList key={refreshCount} />
    </main>
  );
}
