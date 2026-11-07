-- FactoryTwin AI — core schema, multi-tenancy and Row Level Security
create extension if not exists pgcrypto;

-- ───────── Identity ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text, created_at timestamptz default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, industry text, size text, timezone text default 'UTC',
  created_by uuid references auth.users(id), created_at timestamptz default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','administrator','plant_manager','operations_director','production_planner','maintenance_manager','maintenance_technician','quality_manager','energy_manager','factory_engineer','viewer')),
  created_at timestamptz default now(), unique (organization_id, user_id)
);

-- ───────── Helper functions ─────────
create or replace function public.is_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = org and user_id = auth.uid());
$$;
create or replace function public.has_role(org uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = org and user_id = auth.uid() and role = any(roles));
$$;
create or replace function public.can_write(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = org and user_id = auth.uid() and role <> 'viewer');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ───────── Organization-owned tables ─────────
create table public.organization_settings (organization_id uuid primary key references public.organizations(id) on delete cascade, settings jsonb default '{}'::jsonb);
create table public.factories (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, name text not null, location text, timezone text, manager_name text, description text, created_at timestamptz default now());
create table public.factory_areas (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid not null references public.factories(id) on delete cascade, name text not null, description text, created_at timestamptz default now());
create table public.production_lines (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid not null references public.factories(id) on delete cascade, area_id uuid references public.factory_areas(id) on delete set null, name text not null, code text, capacity_per_hour numeric, status text default 'unknown', created_at timestamptz default now());
create table public.equipment (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete cascade, line_id uuid references public.production_lines(id) on delete set null, code text not null, name text not null, category text, manufacturer text, model text, installed_on date, operating_hours numeric, rated_power_kw numeric, status text default 'unknown', status_recorded_at timestamptz, created_at timestamptz default now(), unique (organization_id, code));
create table public.equipment_relationships (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, upstream_id uuid not null references public.equipment(id) on delete cascade, downstream_id uuid not null references public.equipment(id) on delete cascade, relation text default 'feeds', created_at timestamptz default now());
create table public.equipment_readings (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, equipment_id uuid not null references public.equipment(id) on delete cascade, recorded_at timestamptz not null, metric text not null, value numeric not null, unit text, original_value numeric, original_unit text, source text default 'upload', created_at timestamptz default now());
create table public.equipment_operating_logs (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, equipment_id uuid not null references public.equipment(id) on delete cascade, started_at timestamptz not null, ended_at timestamptz, state text, source text default 'upload', created_at timestamptz default now());
create table public.production_orders (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, order_no text not null, product text, quantity numeric not null, quantity_done numeric default 0, due_date date, priority int default 3, status text default 'open', created_at timestamptz default now(), unique (organization_id, order_no));
create table public.production_records (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, equipment_id uuid references public.equipment(id) on delete set null, order_id uuid references public.production_orders(id) on delete set null, recorded_at timestamptz not null, shift text, units_produced numeric not null, units_good numeric, planned_minutes numeric, run_minutes numeric, ideal_cycle_seconds numeric, source text default 'upload', created_at timestamptz default now());
create table public.production_schedules (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, order_id uuid references public.production_orders(id) on delete cascade, line_id uuid references public.production_lines(id) on delete set null, start_at timestamptz, end_at timestamptz, status text default 'planned', created_at timestamptz default now());
create table public.production_events (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, event_type text, occurred_at timestamptz not null, description text, created_at timestamptz default now());
create table public.downtime_events (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, equipment_id uuid references public.equipment(id) on delete set null, started_at timestamptz not null, ended_at timestamptz, duration_minutes numeric not null, reason text, category text, planned boolean default false, source text default 'upload', created_at timestamptz default now());
create table public.maintenance_records (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, equipment_id uuid references public.equipment(id) on delete cascade, performed_at timestamptz not null, type text, description text, technician text, cost numeric, duration_minutes numeric, created_at timestamptz default now());
create table public.maintenance_tasks (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, equipment_id uuid references public.equipment(id) on delete cascade, title text not null, due_date date, status text default 'open', priority int default 3, assigned_to uuid references auth.users(id), created_at timestamptz default now());
create table public.quality_inspections (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, batch_no text, inspected_at timestamptz not null, sample_size numeric, defects_found numeric default 0, result text, created_at timestamptz default now());
create table public.quality_defects (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, inspection_id uuid references public.quality_inspections(id) on delete cascade, category text, count numeric default 1, description text, created_at timestamptz default now());
create table public.scrap_records (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, recorded_at timestamptz not null, quantity numeric not null, reason text, cost numeric, created_at timestamptz default now());
create table public.energy_records (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, equipment_id uuid references public.equipment(id) on delete set null, recorded_at timestamptz not null, kwh numeric not null, shift text, units_produced numeric, original_value numeric, original_unit text, created_at timestamptz default now());
create table public.material_records (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, material text not null, quantity_on_hand numeric, unit text, reorder_level numeric, recorded_at timestamptz default now(), created_at timestamptz default now());
create table public.digital_twin_models (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete cascade, name text, model jsonb default '{}'::jsonb, created_at timestamptz default now());
create table public.digital_twin_versions (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, model_id uuid references public.digital_twin_models(id) on delete cascade, version int not null, snapshot jsonb, created_by uuid references auth.users(id), created_at timestamptz default now());
create table public.operational_metrics (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete cascade, metric text not null, value numeric, period_start timestamptz, period_end timestamptz, definition text, created_at timestamptz default now());
create table public.scenario_definitions (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete cascade, name text not null, type text not null, assumptions jsonb default '{}'::jsonb, created_by uuid references auth.users(id), created_at timestamptz default now());
create table public.scenario_runs (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, definition_id uuid references public.scenario_definitions(id) on delete cascade, run_by uuid references auth.users(id), baseline jsonb, created_at timestamptz default now());
create table public.scenario_results (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, run_id uuid references public.scenario_runs(id) on delete cascade, result jsonb, narrative text, created_at timestamptz default now());
create table public.ai_insights (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, agent_key text, kind text default 'ai_assessment', title text, body text, evidence jsonb, confidence text, created_at timestamptz default now());
create table public.ai_agents (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, agent_key text not null, enabled boolean default true, unique (organization_id, agent_key));
create table public.ai_agent_runs (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, agent_key text not null, user_id uuid references auth.users(id), prompt text, response text, status text, created_at timestamptz default now());
create table public.recommended_actions (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, factory_id uuid references public.factories(id) on delete set null, line_id uuid references public.production_lines(id) on delete set null, equipment_id uuid references public.equipment(id) on delete set null, title text not null, description text, evidence jsonb, priority text default 'medium', impact text, confidence text, source text default 'manual', assigned_to uuid references auth.users(id), approval_status text default 'pending' check (approval_status in ('pending','approved','rejected')), implementation_status text default 'not_started' check (implementation_status in ('not_started','in_progress','completed','cancelled')), completed_on date, outcome text, notes text, created_by uuid references auth.users(id), created_at timestamptz default now());
create table public.action_approvals (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, action_id uuid not null references public.recommended_actions(id) on delete cascade, decided_by uuid references auth.users(id), decision text not null, note text, created_at timestamptz default now());
create table public.improvement_projects (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, action_id uuid references public.recommended_actions(id) on delete set null, title text not null, started_on date, baseline jsonb, outcome jsonb, status text default 'active', created_at timestamptz default now());
create table public.reports (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, title text not null, type text not null, params jsonb, content jsonb, created_by uuid references auth.users(id), created_at timestamptz default now());
create table public.data_imports (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, category text not null, file_name text, total int default 0, imported int default 0, rejected int default 0, duplicates int default 0, needs_review int default 0, status text default 'completed', issues jsonb, created_by uuid references auth.users(id), created_at timestamptz default now());
create table public.imported_files (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, import_id uuid references public.data_imports(id) on delete cascade, storage_path text, created_at timestamptz default now());
create table public.integrations (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, kind text not null, name text, status text default 'not_connected', config jsonb default '{}'::jsonb, created_at timestamptz default now());
create table public.subscriptions (id uuid primary key default gen_random_uuid(), organization_id uuid not null unique references public.organizations(id) on delete cascade, plan text default 'none', status text default 'inactive', updated_by text, updated_at timestamptz default now());
create table public.usage_records (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid references auth.users(id), kind text not null, units int default 1, meta jsonb, created_at timestamptz default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid references auth.users(id), action text not null, entity text, entity_id text, details jsonb, created_at timestamptz default now());

create index on public.equipment_readings (organization_id, equipment_id, recorded_at);
create index on public.production_records (organization_id, line_id, recorded_at);
create index on public.downtime_events (organization_id, line_id, started_at);
create index on public.energy_records (organization_id, recorded_at);
create index on public.usage_records (organization_id, kind, created_at);

-- ───────── Row Level Security ─────────
-- Generic org-scoped tables: members read; non-viewer roles write; privileged roles delete.
do $$
declare t text;
begin
  foreach t in array array[
    'factories','factory_areas','production_lines','equipment','equipment_relationships','equipment_readings',
    'equipment_operating_logs','production_orders','production_records','production_schedules','production_events',
    'downtime_events','maintenance_records','maintenance_tasks','quality_inspections','quality_defects','scrap_records',
    'energy_records','material_records','digital_twin_models','digital_twin_versions','operational_metrics',
    'scenario_definitions','scenario_runs','scenario_results','ai_insights','ai_agents','ai_agent_runs',
    'recommended_actions','action_approvals','improvement_projects','reports','data_imports','imported_files',
    'integrations','organization_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_select" on public.%I for select using (public.is_member(organization_id))', t, t);
    execute format('create policy "%s_insert" on public.%I for insert with check (public.can_write(organization_id))', t, t);
    execute format('create policy "%s_update" on public.%I for update using (public.can_write(organization_id)) with check (public.can_write(organization_id))', t, t);
    execute format('create policy "%s_delete" on public.%I for delete using (public.has_role(organization_id, array[''owner'',''administrator'',''plant_manager'',''operations_director'']))', t, t);
  end loop;
end $$;

-- Profiles
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or exists (select 1 from organization_members a join organization_members b on a.organization_id = b.organization_id where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update_self on public.profiles for update using (id = auth.uid());

-- Organizations & membership
alter table public.organizations enable row level security;
create policy org_select on public.organizations for select using (public.is_member(id));
create policy org_update on public.organizations for update using (public.has_role(id, array['owner','administrator']));
alter table public.organization_members enable row level security;
create policy members_select on public.organization_members for select using (public.is_member(organization_id));
create policy members_insert on public.organization_members for insert with check (public.has_role(organization_id, array['owner','administrator']));
create policy members_update on public.organization_members for update using (public.has_role(organization_id, array['owner','administrator']));
create policy members_delete on public.organization_members for delete using (public.has_role(organization_id, array['owner','administrator']));

-- Subscriptions: read-only for members. Only the service role (trusted payment confirmation / admin) writes.
alter table public.subscriptions enable row level security;
create policy subs_select on public.subscriptions for select using (public.is_member(organization_id));

-- Usage: members read; inserts happen server-side after entitlement checks.
alter table public.usage_records enable row level security;
create policy usage_select on public.usage_records for select using (public.is_member(organization_id));
create policy usage_insert on public.usage_records for insert with check (public.can_write(organization_id));

-- Audit log: append-only; privileged roles read.
alter table public.audit_logs enable row level security;
create policy audit_select on public.audit_logs for select using (public.has_role(organization_id, array['owner','administrator','operations_director','plant_manager']));
create policy audit_insert on public.audit_logs for insert with check (public.is_member(organization_id) and user_id = auth.uid());

-- ───────── Organization bootstrap ─────────
create or replace function public.create_organization(p_name text, p_industry text, p_size text, p_timezone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into organizations (name, industry, size, timezone, created_by) values (p_name, p_industry, p_size, coalesce(p_timezone,'UTC'), auth.uid()) returning id into org;
  insert into organization_members (organization_id, user_id, role) values (org, auth.uid(), 'owner');
  insert into organization_settings (organization_id) values (org);
  insert into subscriptions (organization_id) values (org);
  insert into audit_logs (organization_id, user_id, action, entity, entity_id) values (org, auth.uid(), 'organization.created', 'organization', org::text);
  return org;
end $$;
grant execute on function public.create_organization(text,text,text,text) to authenticated;

-- ───────── Storage: private bucket, files under <organization_id>/ ─────────
insert into storage.buckets (id, name, public) values ('imports', 'imports', false) on conflict do nothing;
create policy imports_read on storage.objects for select using (bucket_id = 'imports' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy imports_write on storage.objects for insert with check (bucket_id = 'imports' and public.can_write(((storage.foldername(name))[1])::uuid));
