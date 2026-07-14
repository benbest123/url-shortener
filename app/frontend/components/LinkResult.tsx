import ExternalLinkIcon from "./ExternalLinkIcon";

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
        <ExternalLinkIcon />
      </a>
    </div>
  );
}
