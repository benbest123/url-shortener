"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  email: string;
};

export default function AuthHeader({ email }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className='flex items-center justify-between'>
      <p className='text-sm text-zinc-500'>
        Signed in as <span className='font-medium text-zinc-900'>{email}</span>
      </p>
      <button
        onClick={handleLogout}
        disabled={loading}
        className='rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50'
      >
        {loading ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
