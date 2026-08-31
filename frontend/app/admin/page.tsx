"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/roles");
  }, [router]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
      <p className="text-slate-400">Admin Console…</p>
    </main>
  );
}
