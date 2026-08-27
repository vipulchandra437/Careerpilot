import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Career Platform</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-md">
        AI-assisted career development for CS students
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
