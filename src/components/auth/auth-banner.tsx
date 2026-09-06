import Link from "next/link";

// WHY amber (not red): the auth spec asks for warning tones on banners; red stays
// reserved for field-level errors (DESIGN.md "standard semantics only" + the
// build spec's "amber warning tones, never raw red console text").
export function AuthBanner({
  message,
  linkHref,
  linkLabel,
}: {
  message: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
    >
      <p>{message}</p>
      {linkHref && linkLabel ? (
        <Link
          href={linkHref}
          className="mt-1 inline-block font-medium underline underline-offset-4"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}