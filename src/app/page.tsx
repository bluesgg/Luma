import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Luma</h1>
      <p className="text-xl text-muted-foreground mb-8">
        AI-powered PDF learning assistant
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 border rounded-md hover:bg-accent"
        >
          Register
        </Link>
      </div>
    </main>
  )
}
