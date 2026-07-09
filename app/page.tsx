"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ShortenForm from "@/app/frontend/components/ShortenForm";
import LinkResult from "@/app/frontend/components/LinkResult";
import LinkList from "@/app/frontend/components/LinkList";
import AuthHeader from "@/app/frontend/components/AuthHeader";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        router.replace("/login");
        return;
      }
      const data = await response.json();
      setEmail(data.email);
    }

    checkAuth();
  }, [router]);

  function handleSuccess(url: string) {
    setShortUrl(url);
    setRefreshCount(c => c + 1);
  }

  if (!email) {
    return null;
  }

  return (
    <main className='min-h-screen bg-zinc-50'>
      <div className='max-w-screen-lg mx-auto px-4 py-8 md:px-6 space-y-6'>
        <AuthHeader email={email} />
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
