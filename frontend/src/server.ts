/**
 * TanStack Start server entry — the handler Nitro bundles into the production
 * server function (`index.mjs`). Optional in Start (a default exists), but the
 * generated default only serves the raw `index.html` template, which is why the
 * built output rendered an empty shell before this file was added.
 *
 * `defaultStreamHandler` streams the SSR'd router output; `createStartHandler`
 * binds it to the app's `Register` types (see `routeTree.gen.ts`).
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

const fetch = createStartHandler(defaultStreamHandler);

export default createServerEntry({
  fetch(request) {
    return fetch(request);
  },
});
