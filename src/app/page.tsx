// WHY the landing IS the journey map: the 3D route doubles as the product
// tour — every stop is a real feature wired to its dashboard route, so the
// page explains the product the same way you use it. Signed-out visitors who
// click a stop get bounced through /login (middleware) with a callbackUrl,
// landing back on the right screen after signing in.

import JourneyMap from "@/components/graphify/journey-map";

export default function Home() {
  return (
    <JourneyMap
      title="Your path to hired, laid out."
      subtitle="Eight stops on one route — from study plan to mock interview. Drag to turn the map, click a stop to open it."
      actions={[
        { label: "Start free", href: "/register", variant: "primary" },
        { label: "Log in", href: "/login", variant: "secondary" },
      ]}
    />
  );
}
