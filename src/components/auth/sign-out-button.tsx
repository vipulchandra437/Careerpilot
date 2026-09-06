"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={signingOut}
      onClick={() => {
        setSigningOut(true);
        // WHY landing (not /dashboard): middleware would just bounce the cleared
        // session to /login; the landing page is the friendlier destination.
        void signOut({ callbackUrl: "/" });
      }}
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}