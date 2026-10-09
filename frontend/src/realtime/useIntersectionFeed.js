import { useEffect, useState } from "react";
import { subscribeToIntersections } from "./socket.js";

// Latest live data for each intersection id: { [id]: data }. Ids with no
// update since the page loaded are absent (the backend has no "get latest
// state" endpoint yet).
export function useIntersectionFeed(ids) {
  const [latest, setLatest] = useState({});
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return undefined;
    return subscribeToIntersections(key.split(","), (id, data) => {
      setLatest((prev) => ({ ...prev, [id]: data }));
    });
  }, [key]);

  return latest;
}
