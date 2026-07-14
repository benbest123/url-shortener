"use client";

import { useEffect, useState } from "react";
import ExternalLinkIcon from "./ExternalLinkIcon";

type UrlItem = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
};

export default function LinkList() {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUrls() {
      const response = await fetch("/api/urls");
      if (!response.ok) {
        setError("Failed to load links.");
        setLoading(false);
        return;
      }
      const data = await response.json();
      setUrls(data);
      setLoading(false);
    }

    fetchUrls();
  }, []);

  return (
    <div className='rounded-xl border border-zinc-200 bg-white shadow-sm'>
      <div className='border-b border-zinc-200 px-6 py-4'>
        <h2 className='text-xl font-medium text-zinc-900'>Your links</h2>
      </div>
      <div className='p-6'>
        {error && <p className='text-sm text-red-600'>{error}</p>}

        {loading && (
          <div className='space-y-2'>
            {[1, 2, 3].map(n => (
              <div key={n} className='h-10 animate-pulse rounded-md bg-zinc-100' />
            ))}
          </div>
        )}

        {!loading && !error && urls.length === 0 && <p className='text-sm text-zinc-400'>No links yet.</p>}

        {!loading && urls.length > 0 && (
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-400'>
                <th className='pb-2 pr-4'>Short URL</th>
                <th className='pb-2 pr-4'>Original URL</th>
                <th className='pb-2 pr-4'>Expires</th>
                <th className='pb-2' />
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-100'>
              {urls.map(item => (
                <tr key={item.shortCode}>
                  <td className='py-3 pr-4 font-medium text-zinc-900'>{item.shortCode}</td>
                  <td className='max-w-xs truncate py-3 pr-4 text-zinc-500'>{item.originalUrl}</td>
                  <td className='py-3 pr-4 text-zinc-500'>
                    {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className='py-3'>
                    <a
                      href={item.shortUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={`Open ${item.shortUrl}`}
                      className='text-zinc-400 hover:text-zinc-900'
                    >
                      <ExternalLinkIcon />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
