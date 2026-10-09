import { io } from "socket.io-client";

// Single Socket.IO connection shared by the whole app. It connects to the
// page's own origin; the Vite proxy (dev) and nginx (prod) forward
// /socket.io to Flask-SocketIO.
//
// Event names match backend/app/extensions.py and the redis_listener in
// backend/app/blueprints/intersections/routes.py. The SRS calls them
// subscribe_to_intersections / live_update instead - if the backend switches,
// only this object needs to change.
const EVENTS = {
  join: "join_room",
  leave: "leave_room",
  update: "traffic_update",
};

let socket = null;
// intersection_id -> number of active subscribers, so a room is left only
// when nobody needs it any more.
const roomCounts = new Map();
const listeners = new Set();

function getSocket() {
  if (socket) return socket;
  socket = io({ path: "/socket.io", withCredentials: true });

  // Room membership is per connection, so rejoin everything after a reconnect.
  socket.on("connect", () => {
    for (const id of roomCounts.keys()) {
      socket.emit(EVENTS.join, { intersection_id: id });
    }
  });

  // Payload: { intersection_id, data } where data is the body the edge module
  // POSTed to /api/intersections/<id>/data.
  socket.on(EVENTS.update, (msg) => {
    if (!msg || !msg.intersection_id) return;
    for (const fn of listeners) fn(msg.intersection_id, msg.data);
  });

  return socket;
}

// Receive live updates for the given intersection ids. Returns an
// unsubscribe function.
export function subscribeToIntersections(ids, onUpdate) {
  const s = getSocket();
  const wanted = new Set(ids);

  for (const id of wanted) {
    const count = roomCounts.get(id) || 0;
    roomCounts.set(id, count + 1);
    // Before the first connect, the "connect" handler joins for us.
    if (count === 0 && s.connected) {
      s.emit(EVENTS.join, { intersection_id: id });
    }
  }

  const listener = (id, data) => {
    if (wanted.has(id)) onUpdate(id, data);
  };
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    for (const id of wanted) {
      const count = (roomCounts.get(id) || 1) - 1;
      if (count > 0) {
        roomCounts.set(id, count);
      } else {
        roomCounts.delete(id);
        if (s.connected) s.emit(EVENTS.leave, { intersection_id: id });
      }
    }
  };
}
