import { useEffect, useMemo, useState } from "react";
import { intersectionsApi } from "../api/client.js";
import { useIntersectionFeed } from "../realtime/useIntersectionFeed.js";
import IntersectionMap from "./IntersectionMap.jsx";
import IntersectionDetailPanel from "./IntersectionDetailPanel.jsx";

// SRS Tab 1 (Live Monitoring): map of all intersections plus the detail panel
// for the selected one.
export default function LiveMonitoring() {
  const [intersections, setIntersections] = useState([]);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    intersectionsApi
      .list()
      .then((list) => {
        if (!cancelled) setIntersections(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ids = useMemo(() => intersections.map((i) => i.id), [intersections]);
  const liveData = useIntersectionFeed(ids);
  const selected = intersections.find((i) => i.id === selectedId) || null;

  if (error) {
    return <p className="error">Could not load intersections: {error}</p>;
  }

  return (
    <section className="live-monitoring">
      <IntersectionMap
        intersections={intersections}
        liveData={liveData}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <IntersectionDetailPanel
        intersection={selected}
        data={selected ? liveData[selected.id] : null}
        summary={{
          total: intersections.length,
          live: ids.filter((id) => liveData[id]).length,
        }}
      />
    </section>
  );
}
