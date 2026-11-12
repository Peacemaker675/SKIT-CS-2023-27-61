import { getSocket } from "./socket.js";

// Optional server-side alerts (Dependencies V5). Nothing happens until the
// backend emits this event. The mock feed has no socket, so stay off then.
const ALERT_EVENT = "alert";

// Calls onAlert(msg) for each pushed alert. Returns an unsubscribe function.
export function subscribeToServerAlerts(onAlert) {
  if (import.meta.env.VITE_USE_MOCKS === "true") return () => {};
  const socket = getSocket();
  socket.on(ALERT_EVENT, onAlert);
  return () => socket.off(ALERT_EVENT, onAlert);
}
