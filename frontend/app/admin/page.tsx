"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/roles");
  }, [router]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="text-muted">Admin Console…</p>
    </main>
  );
}
