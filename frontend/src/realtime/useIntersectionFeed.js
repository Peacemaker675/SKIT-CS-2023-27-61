import { useEffect, useState } from "react";
import { subscribeToIntersections } from "./socket.js";
import { subscribeToMockIntersections } from "../mocks/liveFeed.js";
import { intersectionsApi } from "../api/client.js";

// VITE_USE_MOCKS=true swaps the socket for a fake feed (dev only).
const subscribe =
  import.meta.env.VITE_USE_MOCKS === "true"
    ? subscribeToMockIntersections
    : subscribeToIntersections;

// Latest live data for each intersection id: { [id]: data }. Starts from
// intersectionsApi.latest() (empty until the backend serves that route), then
// live updates take over. Ids with no data yet are absent.
export function useIntersectionFeed(ids) {
  const [latest, setLatest] = useState({});
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    intersectionsApi
      .latest(key.split(","))
      .then((seed) => {
        // Live updates that arrived first are newer, so they win.
        if (active) setLatest((prev) => ({ ...seed, ...prev }));
      })
      .catch(() => {});
    const unsubscribe = subscribe(key.split(","), (id, data) => {
      setLatest((prev) => ({ ...prev, [id]: data }));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [key]);

  return latest;
}
