import type { MetadataRoute } from "next";

// WHY allow all: the landing page is the indexable surface; every dashboard page
// is already auth-gated, so robots.txt adds no protection there — and blocking
// would only hide the marketing copy from search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
  };
}