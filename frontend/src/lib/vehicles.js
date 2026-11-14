// Emergency vehicle types (emergency.schema.json#/$defs/vehicleType) and the
// letter shown on the map marker for each.
export const VEHICLE_TYPES = ["ambulance", "fire", "police"];

const LETTERS = { ambulance: "A", fire: "F", police: "P" };

export function vehicleLetter(type) {
  return LETTERS[type] || "?";
}
