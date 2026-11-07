export const ROLES = [
  "owner", "administrator", "plant_manager", "operations_director", "production_planner", "maintenance_manager",
  "maintenance_technician", "quality_manager", "energy_manager", "factory_engineer", "viewer",
] as const;
export type Role = (typeof ROLES)[number];

export const roleLabel = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const ADMIN: Role[] = ["owner", "administrator"];
const LEADERS: Role[] = [...ADMIN, "plant_manager", "operations_director"];

/** Mirrors the RLS policies in 0001_schema.sql; UI uses it to hide controls, the DB enforces it. */
export const can = {
  write: (r: Role) => r !== "viewer",
  delete: (r: Role) => LEADERS.includes(r),
  manageTeam: (r: Role) => ADMIN.includes(r),
  approveActions: (r: Role) => LEADERS.includes(r),
  viewAudit: (r: Role) => LEADERS.includes(r),
};
