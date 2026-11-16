import { useEffect, useMemo, useState } from "react";
import { intersectionsApi } from "../api/client.js";
import { useIntersectionFeed } from "../realtime/useIntersectionFeed.js";
import IntersectionMap from "./IntersectionMap.jsx";
import IntersectionDetailPanel from "./IntersectionDetailPanel.jsx";
import CongestionSummaryList from "./CongestionSummaryList.jsx";
import CongestionCounts from "./CongestionCounts.jsx";
import AlertFeed from "./AlertFeed.jsx";
import EmergencyForm from "./EmergencyForm.jsx";
import EmergencyPanel from "./EmergencyPanel.jsx";
import { useEmergencies } from "../realtime/useEmergencies.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT } from "../i18n/i18n.js";
import { canManageEmergencies } from "../lib/emergencyForm.js";

// SRS Tab 1 (Live Monitoring): map of all intersections plus the detail panel
// for the selected one.
export default function LiveMonitoring() {
  const [intersections, setIntersections] = useState([]);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const { user } = useAuth();
  const { t } = useT();
  const emergencies = useEmergencies();
  const canStart = canManageEmergencies(user?.role);

  // A newly started corridor is selected so the map zooms to it.
  async function startEmergency(body) {
    const emergency = await emergencies.start(body);
    if (emergency?.id) setSelectedEmergencyId(emergency.id);
    return emergency;
  }

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
    <>
      <div className="live-toolbar">
        <CongestionCounts intersections={intersections} liveData={liveData} />
        {canStart && (
          <button
            type="button"
            className="danger"
            onClick={() => setFormOpen(true)}
            disabled={!intersections.length}
            aria-haspopup="dialog"
          >
            {t("emergency.start")}
          </button>
        )}
      </div>
      <section className="live-monitoring">
        <IntersectionMap
          intersections={intersections}
          liveData={liveData}
          selectedId={selectedId}
          onSelect={setSelectedId}
          emergencies={emergencies.emergencies}
          selectedEmergencyId={selectedEmergencyId}
          onSelectEmergency={setSelectedEmergencyId}
        />
        <div className="live-side">
          <IntersectionDetailPanel
            intersection={selected}
            data={selected ? liveData[selected.id] : null}
            summary={{
              total: intersections.length,
              live: ids.filter((id) => liveData[id]).length,
            }}
          />
          <CongestionSummaryList
            intersections={intersections}
            liveData={liveData}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </section>
      <EmergencyPanel
        emergencies={emergencies.emergencies}
        intersections={intersections}
        error={emergencies.error}
        loading={emergencies.loading}
        selectedId={selectedEmergencyId}
        onSelect={setSelectedEmergencyId}
        onClear={emergencies.clear}
        onCancel={emergencies.cancel}
      />
      <AlertFeed intersections={intersections} liveData={liveData} />
      {formOpen && (
        <EmergencyForm
          intersections={intersections}
          onStart={startEmergency}
          onClose={() => setFormOpen(false)}
        />
      )}
    </>
  );
}
