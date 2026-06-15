"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    async function fetchUrls() {
      const response = await fetch("/api/urls");
      if (!response.ok) {
        setError("Failed to load links.");
        return;
      }
      const data = await response.json();
      setUrls(data);
    }

    fetchUrls();
  }, []);

  if (error) return <p>{error}</p>;

  if (urls.length === 0) return <p>No links yet.</p>;

  return (
    <ul>
      {urls.map(item => (
        <li key={item.shortCode}>
          <a href={item.shortUrl} target='_blank' rel='noopener noreferrer'>
            {item.shortUrl}
          </a>{" "}
          → {item.originalUrl}
        </li>
      ))}
    </ul>
  );
}
