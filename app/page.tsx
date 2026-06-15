import ShortenForm from "@/app/frontend/components/ShortenForm";
import LinkResult from "@/app/frontend/components/LinkResult";
import LinkList from "@/app/frontend/components/LinkList";

export default function Home() {
  return (
    <main className='min-h-screen bg-zinc-50 dark:bg-zinc-900'>
      <ShortenForm />
      <LinkResult />
      <LinkList />
    </main>
  );
}
