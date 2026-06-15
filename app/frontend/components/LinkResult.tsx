type Props = {
  shortUrl: string | null;
};

export default function LinkResult({ shortUrl }: Props) {
  if (!shortUrl) return null;

  return (
    <p>
      Your short URL:{" "}
      <a href={shortUrl} target='_blank' rel='noopener noreferrer'>
        {shortUrl}
      </a>
    </p>
  );
}
