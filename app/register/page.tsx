import Link from "next/link";
import AuthForm from "@/app/frontend/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className='min-h-screen bg-zinc-50'>
      <div className='mx-auto flex max-w-sm flex-col gap-6 px-4 py-16'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight text-zinc-900'>Snip</h1>
          <p className='text-sm text-zinc-500'>Create your account</p>
        </div>
        <div className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm'>
          <AuthForm
            action='/api/auth/register'
            submitLabel='Create account'
            pendingLabel='Creating account…'
            fallbackError='Could not create account. Check your email and password.'
          />
        </div>
        <p className='text-center text-sm text-zinc-500'>
          Already have an account?{" "}
          <Link href='/login' className='font-medium text-zinc-900 hover:underline'>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
