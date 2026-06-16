type Props = {
  shortUrl: string | null;
};

export default function LinkResult({ shortUrl }: Props) {
  if (!shortUrl) return null;

  return (
    <div className='flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4'>
      <div className='min-w-0 space-y-0.5'>
        <p className='text-xs font-medium uppercase tracking-wide text-green-700'>New short URL</p>
        <p className='truncate text-sm font-medium text-zinc-900'>{shortUrl}</p>
      </div>
      <a
        href={shortUrl}
        target='_blank'
        rel='noopener noreferrer'
        aria-label='Open short URL'
        className='shrink-0 rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-4 w-4'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
        >
          <path d='M15 3h6v6' />
          <path d='M10 14 21 3' />
          <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
        </svg>
      </a>
    </div>
  );
}
