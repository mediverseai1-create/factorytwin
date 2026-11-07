import { z } from "zod";

export type FieldType = "text" | "number" | "date" | "datetime" | "select" | "bool" | "ref" | "textarea";
export type RefTable = "factories" | "production_lines" | "equipment" | "production_orders" | "factory_areas";
export type Field = {
  name: string; label: string; type: FieldType; required?: boolean; options?: string[]; ref?: RefTable;
  /** UI-only helper for unit conversion on import (value is converted, original preserved). */
  unitConvert?: "energy" | "duration";
};
export type Entity = {
  table: string; label: string; singular: string; fields: Field[]; columns: string[]; orderBy: string; ascending?: boolean;
  /** Natural key used to detect duplicates on import. */
  naturalKey?: string[]; hasFactory?: boolean; hasLine?: boolean; searchable: string[];
  /** Extra non-stored columns accepted at import (unit handling). */
  extraImport?: Field[];
};

const f = (name: string, label: string, type: FieldType = "text", extra: Partial<Field> = {}): Field => ({ name, label, type, ...extra });
const factoryRef = f("factory_id", "Factory", "ref", { ref: "factories" });
const lineRef = f("line_id", "Production line", "ref", { ref: "production_lines" });
const equipRef = f("equipment_id", "Equipment", "ref", { ref: "equipment" });

export const ENTITIES: Record<string, Entity> = {
  factories: {
    table: "factories", label: "Factories", singular: "factory", orderBy: "name", ascending: true, searchable: ["name", "location"],
    fields: [f("name", "Name", "text", { required: true }), f("location", "Location"), f("timezone", "Timezone"), f("manager_name", "Factory manager"), f("description", "Description", "textarea")],
    columns: ["name", "location", "manager_name", "timezone"], naturalKey: ["name"],
  },
  factory_areas: {
    table: "factory_areas", label: "Production areas", singular: "production area", orderBy: "name", ascending: true, searchable: ["name"],
    fields: [{ ...factoryRef, required: true }, f("name", "Name", "text", { required: true }), f("description", "Description", "textarea")],
    columns: ["name", "factory_id", "description"], naturalKey: ["factory_id", "name"], hasFactory: true,
  },
  production_lines: {
    table: "production_lines", label: "Production lines", singular: "production line", orderBy: "name", ascending: true, searchable: ["name", "code"],
    fields: [{ ...factoryRef, required: true }, f("area_id", "Production area", "ref", { ref: "factory_areas" }), f("name", "Name", "text", { required: true }), f("code", "Code"),
      f("capacity_per_hour", "Nominal capacity (units/hour)", "number"), f("status", "Recorded status", "select", { options: ["unknown", "running", "idle", "stopped", "maintenance"] })],
    columns: ["name", "code", "factory_id", "capacity_per_hour", "status"], naturalKey: ["factory_id", "name"], hasFactory: true,
  },
  equipment: {
    table: "equipment", label: "Equipment", singular: "equipment item", orderBy: "name", ascending: true, searchable: ["name", "code", "category", "manufacturer"],
    fields: [f("code", "Equipment ID", "text", { required: true }), f("name", "Name", "text", { required: true }), factoryRef, lineRef, f("category", "Category"), f("manufacturer", "Manufacturer"), f("model", "Model"),
      f("installed_on", "Installation date", "date"), f("operating_hours", "Operating hours", "number"), f("rated_power_kw", "Rated power (kW)", "number"),
      f("status", "Recorded status", "select", { options: ["unknown", "running", "idle", "stopped", "maintenance"] })],
    columns: ["code", "name", "category", "factory_id", "line_id", "operating_hours", "status"], naturalKey: ["code"], hasFactory: true, hasLine: true,
  },
  production_orders: {
    table: "production_orders", label: "Production orders", singular: "production order", orderBy: "due_date", ascending: true, searchable: ["order_no", "product"],
    fields: [f("order_no", "Order no.", "text", { required: true }), f("product", "Product"), factoryRef, lineRef, f("quantity", "Quantity", "number", { required: true }), f("quantity_done", "Quantity completed", "number"),
      f("due_date", "Due date", "date"), f("priority", "Priority (1 = highest)", "number"), f("status", "Status", "select", { options: ["open", "in_progress", "completed", "cancelled"] })],
    columns: ["order_no", "product", "line_id", "quantity", "quantity_done", "due_date", "priority", "status"], naturalKey: ["order_no"], hasFactory: true, hasLine: true,
  },
  production_records: {
    table: "production_records", label: "Production records", singular: "production record", orderBy: "recorded_at", searchable: ["shift"],
    fields: [f("recorded_at", "Date / time", "datetime", { required: true }), factoryRef, lineRef, equipRef, f("shift", "Shift"), f("units_produced", "Units produced", "number", { required: true }),
      f("units_good", "Good units", "number"), f("planned_minutes", "Planned minutes", "number"), f("run_minutes", "Run minutes", "number"), f("ideal_cycle_seconds", "Ideal cycle (s/unit)", "number")],
    columns: ["recorded_at", "line_id", "shift", "units_produced", "units_good", "planned_minutes", "run_minutes"], naturalKey: ["line_id", "recorded_at", "shift"], hasFactory: true, hasLine: true,
  },
  downtime_events: {
    table: "downtime_events", label: "Downtime events", singular: "downtime event", orderBy: "started_at", searchable: ["reason", "category"],
    fields: [f("started_at", "Started", "datetime", { required: true }), f("duration_minutes", "Duration (minutes)", "number", { required: true, unitConvert: "duration" }), factoryRef, lineRef, equipRef,
      f("reason", "Recorded reason"), f("category", "Category"), f("planned", "Planned downtime", "bool")],
    columns: ["started_at", "equipment_id", "line_id", "duration_minutes", "reason", "planned"], naturalKey: ["equipment_id", "started_at"], hasFactory: true, hasLine: true,
    extraImport: [f("unit", "Duration unit (min / h / s)")],
  },
  maintenance_records: {
    table: "maintenance_records", label: "Maintenance history", singular: "maintenance record", orderBy: "performed_at", searchable: ["description", "type", "technician"],
    fields: [{ ...equipRef, required: true }, f("performed_at", "Performed", "datetime", { required: true }), f("type", "Type", "select", { options: ["preventive", "corrective", "inspection", "calibration", "other"] }),
      f("description", "Description", "textarea"), f("technician", "Technician"), f("cost", "Cost", "number"), f("duration_minutes", "Duration (min)", "number")],
    columns: ["performed_at", "equipment_id", "type", "description", "technician", "duration_minutes"], naturalKey: ["equipment_id", "performed_at", "type"],
  },
  maintenance_tasks: {
    table: "maintenance_tasks", label: "Maintenance tasks", singular: "maintenance task", orderBy: "due_date", ascending: true, searchable: ["title"],
    fields: [{ ...equipRef, required: true }, f("title", "Task", "text", { required: true }), f("due_date", "Due date", "date"), f("priority", "Priority (1 = highest)", "number"),
      f("status", "Status", "select", { options: ["open", "in_progress", "done", "cancelled"] })],
    columns: ["title", "equipment_id", "due_date", "priority", "status"],
  },
  quality_inspections: {
    table: "quality_inspections", label: "Quality inspections", singular: "inspection", orderBy: "inspected_at", searchable: ["batch_no", "result"],
    fields: [f("inspected_at", "Inspected", "datetime", { required: true }), f("batch_no", "Batch"), factoryRef, lineRef, f("sample_size", "Sample size", "number"), f("defects_found", "Defects found", "number"),
      f("result", "Result", "select", { options: ["pass", "fail", "conditional"] })],
    columns: ["inspected_at", "batch_no", "line_id", "sample_size", "defects_found", "result"], naturalKey: ["batch_no", "inspected_at"], hasFactory: true, hasLine: true,
  },
  scrap_records: {
    table: "scrap_records", label: "Scrap & waste", singular: "scrap record", orderBy: "recorded_at", searchable: ["reason"],
    fields: [f("recorded_at", "Date / time", "datetime", { required: true }), factoryRef, lineRef, f("quantity", "Scrap quantity", "number", { required: true }), f("reason", "Reason"), f("cost", "Cost", "number")],
    columns: ["recorded_at", "line_id", "quantity", "reason", "cost"], naturalKey: ["line_id", "recorded_at", "reason"], hasFactory: true, hasLine: true,
  },
  energy_records: {
    table: "energy_records", label: "Energy records", singular: "energy record", orderBy: "recorded_at", searchable: ["shift"],
    fields: [f("recorded_at", "Date / time", "datetime", { required: true }), f("kwh", "Energy (kWh)", "number", { required: true, unitConvert: "energy" }), factoryRef, lineRef, equipRef, f("shift", "Shift"), f("units_produced", "Units produced in period", "number")],
    columns: ["recorded_at", "line_id", "equipment_id", "kwh", "shift", "units_produced"], naturalKey: ["line_id", "equipment_id", "recorded_at"], hasFactory: true, hasLine: true,
    extraImport: [f("unit", "Energy unit (Wh / kWh / MWh / GJ)")],
  },
  material_records: {
    table: "material_records", label: "Materials & inventory", singular: "material record", orderBy: "material", ascending: true, searchable: ["material"],
    fields: [f("material", "Material", "text", { required: true }), factoryRef, f("quantity_on_hand", "On hand", "number"), f("unit", "Unit"), f("reorder_level", "Reorder level", "number")],
    columns: ["material", "factory_id", "quantity_on_hand", "unit", "reorder_level"], naturalKey: ["factory_id", "material"], hasFactory: true,
  },
  equipment_readings: {
    table: "equipment_readings", label: "Machine readings", singular: "reading", orderBy: "recorded_at", searchable: ["metric"],
    fields: [{ ...equipRef, required: true }, f("recorded_at", "Recorded", "datetime", { required: true }), f("metric", "Metric", "text", { required: true }), f("value", "Value", "number", { required: true }), f("unit", "Unit")],
    columns: ["recorded_at", "equipment_id", "metric", "value", "unit"], naturalKey: ["equipment_id", "recorded_at", "metric"],
  },
};

/** Import categories shown in the wizard → entity. */
export const IMPORT_CATEGORIES: { key: string; label: string; entity: string }[] = [
  { key: "factory", label: "Factory information", entity: "factories" },
  { key: "lines", label: "Production lines", entity: "production_lines" },
  { key: "equipment", label: "Equipment register", entity: "equipment" },
  { key: "readings", label: "Machine readings", entity: "equipment_readings" },
  { key: "production", label: "Production records / shift reports", entity: "production_records" },
  { key: "orders", label: "Production orders", entity: "production_orders" },
  { key: "maintenance", label: "Maintenance history", entity: "maintenance_records" },
  { key: "downtime", label: "Downtime events", entity: "downtime_events" },
  { key: "quality", label: "Quality inspections", entity: "quality_inspections" },
  { key: "scrap", label: "Defect & scrap records", entity: "scrap_records" },
  { key: "energy", label: "Energy consumption", entity: "energy_records" },
  { key: "materials", label: "Inventory & material records", entity: "material_records" },
];

/** Dynamic Zod validation derived from the field list. Empty strings become null; numbers/dates are coerced. */
export function schemaFor(e: Entity) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const fl of e.fields) {
    let s: z.ZodTypeAny;
    switch (fl.type) {
      case "number": s = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number({ invalid_type_error: `${fl.label} must be a number` }).finite().nullable()); break;
      case "bool": s = z.preprocess((v) => (typeof v === "string" ? ["true", "yes", "1", "on", "y"].includes(v.toLowerCase()) : !!v), z.boolean()); break;
      case "date": s = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}/, `${fl.label} must be a valid date`).nullable()); break;
      case "datetime": s = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().refine((x) => !isNaN(Date.parse(x)), `${fl.label} must be a valid date/time`).nullable()); break;
      default: s = z.preprocess((v) => (v === "" || v == null ? null : String(v).trim()), z.string().max(2000).nullable());
    }
    if (fl.required) s = s.refine((v) => v !== null && v !== undefined, `${fl.label} is required`);
    shape[fl.name] = s;
  }
  return z.object(shape);
}

export const CONVERT = {
  energy: (v: number, unit: string) => {
    const u = unit.trim().toLowerCase();
    const k: Record<string, number> = { kwh: 1, wh: 0.001, mwh: 1000, gj: 277.778, mj: 0.277778 };
    return k[u] === undefined ? null : v * k[u];
  },
  duration: (v: number, unit: string) => {
    const u = unit.trim().toLowerCase();
    const k: Record<string, number> = { min: 1, mins: 1, minutes: 1, m: 1, h: 60, hr: 60, hours: 60, s: 1 / 60, sec: 1 / 60, seconds: 1 / 60 };
    return k[u] === undefined ? null : v * k[u];
  },
};
