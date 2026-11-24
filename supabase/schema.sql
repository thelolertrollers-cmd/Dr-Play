-- Doctor Play · taller
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Proyecto vacío: https://supabase.com/dashboard/project/eosxgpwuzhrynjgjpuyl/sql/new
-- Después, en Authentication → Sign In / Providers → Email, desactiva "Confirm email".

create extension if not exists pgcrypto;

create table if not exists public.shop_settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'Doctor Play',
  phone text,
  email text,
  address text,
  legal_name text,
  tax_id text,
  invoice_series text not null default 'DP',
  pending_threshold int not null default 5 check (pending_threshold >= 0),
  surcharge_percent numeric(5,2) not null default 15 check (surcharge_percent >= 0 and surcharge_percent <= 100),
  invite_code text not null default 'TALLER-DP',
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  tax_id text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create sequence if not exists public.repair_seq;

create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  client_id uuid not null references public.clients (id),
  console text,
  fault text,
  detail text,
  cost numeric(10,2) check (cost is null or cost >= 0),
  received_at date not null default (timezone('Europe/Madrid', now()))::date,
  repaired_at date,
  informed_at date,
  collected_at date,
  payment_method text check (
    payment_method is null
    or payment_method in ('efectivo', 'tarjeta', 'bizum', 'transferencia')
  ),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.price_guide (
  id uuid primary key default gen_random_uuid(),
  console text not null,
  console_family text not null,
  fault text not null,
  base_price numeric(10,2) not null check (base_price >= 0),
  min_days int not null check (min_days >= 0),
  max_days int not null check (max_days >= min_days),
  display_order int not null default 0,
  fault_order int not null default 0,
  notes text,
  active boolean not null default true,
  unique (console, fault)
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete restrict,
  clock_in timestamptz not null,
  clock_out timestamptz,
  original_clock_in timestamptz,
  original_clock_out timestamptz,
  correction_note text,
  corrected_at timestamptz,
  corrected_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (clock_out is null or clock_out >= clock_in)
);

create unique index if not exists one_open_shift
  on public.time_entries (employee_id)
  where clock_out is null;

create table if not exists public.invoice_counters (
  series text primary key,
  last_number int not null default 0
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid references public.repairs (id) on delete set null,
  series text not null,
  number int not null,
  issue_date date not null default (timezone('Europe/Madrid', now()))::date,
  issuer_name text,
  issuer_tax_id text,
  client_name text not null,
  client_tax_id text,
  description text not null,
  base_amount numeric(10,2) not null,
  tax_rate numeric(5,2) not null default 21,
  tax_amount numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text,
  status text not null default 'emitida' check (status in ('borrador', 'emitida')),
  verifactu_status text not null default 'no_conectada',
  previous_hash text,
  invoice_hash text,
  qr_payload text,
  created_at timestamptz not null default now(),
  unique (series, number)
);

create unique index if not exists invoices_one_repair
  on public.invoices (repair_id)
  where repair_id is not null;

create index if not exists repairs_received_idx on public.repairs (received_at desc);
create index if not exists repairs_client_idx on public.repairs (client_id);
create index if not exists repairs_open_idx on public.repairs (received_at) where repaired_at is null;
create index if not exists time_entries_employee_idx on public.time_entries (employee_id, clock_in desc);
create index if not exists clients_phone_idx on public.clients (phone);

insert into public.shop_settings (
  id, shop_name, phone, email, address, legal_name, invoice_series,
  pending_threshold, surcharge_percent, invite_code
) values (
  1,
  'Doctor Play',
  '614 121 568',
  'Electronicplaydoctor@gmail.com',
  'C. Crisantemo, 12, 28903 Getafe, Madrid',
  'Doctor Play',
  'DP',
  5,
  15,
  'TALLER-DP'
)
on conflict (id) do nothing;

insert into public.invoice_counters (series, last_number)
values ('DP', 0)
on conflict (series) do nothing;

insert into public.price_guide (
  console, console_family, fault, base_price, min_days, max_days, display_order, fault_order, notes
)
select
  c.console,
  c.family,
  f.fault,
  (c.prices ->> f.key)::numeric,
  f.min_days,
  f.max_days,
  c.display_order,
  f.fault_order,
  trim(both from f.note || case when c.extra <> '' then ' ' || c.extra else '' end)
from jsonb_to_recordset($json$[
  {"console":"PS3","family":"playstation","display_order":10,"extra":"","prices":{"on":65,"noise":45,"charge":49,"off":59}},
  {"console":"PS4","family":"playstation","display_order":20,"extra":"","prices":{"on":75,"noise":49,"charge":55,"off":69}},
  {"console":"PS4 Pro","family":"playstation","display_order":30,"extra":"","prices":{"on":85,"noise":55,"charge":59,"off":75}},
  {"console":"PS5","family":"playstation","display_order":40,"extra":"","prices":{"on":119,"noise":69,"charge":79,"off":99}},
  {"console":"PS5 Pro","family":"playstation","display_order":50,"extra":"Estimación para un modelo reciente. El precio se confirma al diagnosticar.","prices":{"on":139,"noise":79,"charge":89,"off":119}},
  {"console":"Switch Lite","family":"nintendo","display_order":60,"extra":"","prices":{"on":69,"noise":39,"charge":45,"off":59}},
  {"console":"Switch","family":"nintendo","display_order":70,"extra":"","prices":{"on":79,"noise":45,"charge":55,"off":69}},
  {"console":"Switch OLED","family":"nintendo","display_order":80,"extra":"","prices":{"on":89,"noise":49,"charge":59,"off":75}},
  {"console":"Switch 2","family":"nintendo","display_order":90,"extra":"Estimación para un modelo reciente. El precio se confirma al diagnosticar.","prices":{"on":129,"noise":79,"charge":89,"off":109}},
  {"console":"Xbox One","family":"xbox","display_order":100,"extra":"","prices":{"on":79,"noise":49,"charge":55,"off":69}},
  {"console":"Xbox Series S","family":"xbox","display_order":110,"extra":"","prices":{"on":99,"noise":59,"charge":69,"off":85}},
  {"console":"Xbox Series X","family":"xbox","display_order":120,"extra":"","prices":{"on":119,"noise":69,"charge":75,"off":99}}
]$json$::jsonb) as c(
  console text,
  family text,
  display_order int,
  extra text,
  prices jsonb
)
cross join (
  values
    ('on', 'No enciende', 1, 2, 5, 'Revisión de alimentación y placa.'),
    ('noise', 'Hace ruido', 2, 1, 2, 'Limpieza, pasta térmica y control de temperatura.'),
    ('charge', 'No carga', 3, 1, 3, 'Puerto, fuente o conector.'),
    ('off', 'Se apaga sola', 4, 2, 4, 'Suele ser calor, alimentación o un fallo de placa.')
) as f(key, fault, fault_order, min_days, max_days, note)
on conflict (console, fault) do nothing;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
  code text;
  expected text;
begin
  perform pg_advisory_xact_lock(742001);
  select count(*) into admin_count from public.profiles where role = 'admin';
  code := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');
  select invite_code into expected from public.shop_settings where id = 1;

  if admin_count > 0 and (code is null or code is distinct from expected) then
    raise exception 'Código de invitación no válido';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Empleado'),
    case when admin_count = 0 then 'admin' else 'employee' end
  );
  return new;
end;
$$;

create or replace function public.set_repair_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is null then
    new.code := 'DP-' || to_char(timezone('Europe/Madrid', now()), 'YY') || '-' || lpad(nextval('public.repair_seq')::text, 4, '0');
  end if;
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.quote_repair(p_console text, p_fault text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  guide public.price_guide%rowtype;
  settings public.shop_settings%rowtype;
  pending int;
  busy boolean;
  price numeric;
  dmin int;
  dmax int;
  pct numeric;
begin
  select * into guide
  from public.price_guide
  where console = p_console and fault = p_fault and active
  limit 1;

  if not found then
    return json_build_object('found', false);
  end if;

  select * into settings from public.shop_settings where id = 1;
  select count(*) into pending from public.repairs where repaired_at is null;

  pct := coalesce(settings.surcharge_percent, 15);
  busy := pending > coalesce(settings.pending_threshold, 5);
  price := guide.base_price;
  dmin := guide.min_days;
  dmax := guide.max_days;

  if busy then
    price := round(price * (1 + pct / 100.0));
    dmin := ceil(dmin * (1 + pct / 100.0))::int;
    dmax := ceil(dmax * (1 + pct / 100.0))::int;
  end if;

  return json_build_object(
    'found', true,
    'live', true,
    'console', guide.console,
    'fault', guide.fault,
    'price', price,
    'base_price', guide.base_price,
    'min_days', dmin,
    'max_days', dmax,
    'pending', pending,
    'threshold', settings.pending_threshold,
    'busy', busy,
    'surcharge_percent', case when busy then pct else 0 end,
    'notes', guide.notes
  );
end;
$$;

create or replace function public.list_catalog()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    json_agg(
      json_build_object(
        'console', console,
        'family', console_family,
        'fault', fault,
        'display_order', display_order,
        'fault_order', fault_order
      )
      order by display_order, fault_order
    ),
    '[]'::json
  )
  from public.price_guide
  where active;
$$;

create or replace function public.shop_public()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'shop_name', shop_name,
    'phone', phone,
    'address', address
  )
  from public.shop_settings
  where id = 1;
$$;

create or replace function public.clock_in()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.time_entries%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Cuenta no activa';
  end if;
  if exists (
    select 1 from public.time_entries
    where employee_id = auth.uid() and clock_out is null
  ) then
    raise exception 'Ya tienes un fichaje abierto';
  end if;

  insert into public.time_entries (employee_id, clock_in)
  values (auth.uid(), now())
  returning * into row;

  return row_to_json(row);
end;
$$;

create or replace function public.clock_out()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.time_entries%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Cuenta no activa';
  end if;

  update public.time_entries
  set clock_out = now()
  where employee_id = auth.uid() and clock_out is null
  returning * into row;

  if not found then
    raise exception 'No tienes un fichaje abierto';
  end if;

  return row_to_json(row);
end;
$$;

create or replace function public.correct_time_entry(
  p_id uuid,
  p_clock_in timestamptz,
  p_clock_out timestamptz,
  p_note text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.time_entries%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo administración';
  end if;
  if p_note is null or length(trim(p_note)) < 3 then
    raise exception 'La corrección necesita un motivo';
  end if;
  if p_clock_out is null or p_clock_out < p_clock_in then
    raise exception 'La salida tiene que ser posterior a la entrada';
  end if;

  update public.time_entries
  set
    original_clock_in = coalesce(original_clock_in, clock_in),
    original_clock_out = coalesce(original_clock_out, clock_out),
    clock_in = p_clock_in,
    clock_out = p_clock_out,
    correction_note = trim(p_note),
    corrected_at = now(),
    corrected_by = auth.uid()
  where id = p_id
  returning * into row;

  if not found then
    raise exception 'Fichaje no encontrado';
  end if;

  return row_to_json(row);
end;
$$;

create or replace function public.create_invoice_from_repair(
  p_repair uuid,
  p_client_tax_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.invoices%rowtype;
  v_repair public.repairs%rowtype;
  v_client public.clients%rowtype;
  v_settings public.shop_settings%rowtype;
  v_series text;
  v_number int;
  v_total numeric(10,2);
  v_base numeric(10,2);
  v_tax numeric(10,2);
  v_desc text;
  v_invoice public.invoices%rowtype;
  v_tax_id text;
begin
  if not public.is_staff() then
    raise exception 'Cuenta no activa';
  end if;

  select * into v_existing from public.invoices where repair_id = p_repair limit 1;
  if found then
    return row_to_json(v_existing);
  end if;

  select * into v_repair from public.repairs where id = p_repair;
  if not found then
    raise exception 'Reparación no encontrada';
  end if;
  if v_repair.cost is null or v_repair.cost <= 0 then
    raise exception 'La reparación no tiene importe';
  end if;

  select * into v_client from public.clients where id = v_repair.client_id;
  select * into v_settings from public.shop_settings where id = 1;

  v_series := coalesce(nullif(v_settings.invoice_series, ''), 'DP');
  v_tax_id := nullif(trim(coalesce(p_client_tax_id, v_client.tax_id, '')), '');

  insert into public.invoice_counters (series, last_number)
  values (v_series, 0)
  on conflict (series) do nothing;

  update public.invoice_counters
  set last_number = last_number + 1
  where series = v_series
  returning last_number into v_number;

  v_total := round(v_repair.cost, 2);
  v_base := round(v_total / 1.21, 2);
  v_tax := round(v_total - v_base, 2);
  v_desc := concat_ws(' · ',
    'Reparación',
    nullif(v_repair.console, ''),
    nullif(v_repair.fault, ''),
    nullif(v_repair.code, '')
  );

  insert into public.invoices (
    repair_id, series, number, issue_date,
    issuer_name, issuer_tax_id,
    client_name, client_tax_id,
    description, base_amount, tax_rate, tax_amount, total,
    payment_method, status, verifactu_status
  ) values (
    p_repair,
    v_series,
    v_number,
    (timezone('Europe/Madrid', now()))::date,
    coalesce(nullif(v_settings.legal_name, ''), v_settings.shop_name),
    nullif(v_settings.tax_id, ''),
    v_client.name,
    v_tax_id,
    v_desc,
    v_base,
    21,
    v_tax,
    v_total,
    v_repair.payment_method,
    'emitida',
    'no_conectada'
  )
  returning * into v_invoice;

  return row_to_json(v_invoice);
exception
  when unique_violation then
    select * into v_existing from public.invoices where repair_id = p_repair limit 1;
    if found then
      return row_to_json(v_existing);
    end if;
    raise;
end;
$$;

create or replace function public.set_employee(p_id uuid, p_role text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  other_admins int;
begin
  if not public.is_admin() then
    raise exception 'Solo administración';
  end if;
  if p_role not in ('admin', 'employee') then
    raise exception 'Rol no válido';
  end if;

  select count(*) into other_admins
  from public.profiles
  where role = 'admin' and active = true and id <> p_id;

  if other_admins = 0 and (p_role <> 'admin' or p_active = false) then
    raise exception 'Tiene que quedar un administrador activo';
  end if;

  update public.profiles
  set role = p_role, active = p_active
  where id = p_id;
end;
$$;

create or replace function public.update_my_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No has iniciado sesión';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'El nombre es demasiado corto';
  end if;
  update public.profiles
  set full_name = trim(p_name)
  where id = auth.uid();
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists repairs_code on public.repairs;
create trigger repairs_code
  before insert on public.repairs
  for each row execute function public.set_repair_code();

drop trigger if exists repairs_touch on public.repairs;
create trigger repairs_touch
  before update on public.repairs
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.shop_settings;
create trigger settings_touch
  before update on public.shop_settings
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.repairs enable row level security;
alter table public.price_guide enable row level security;
alter table public.time_entries enable row level security;
alter table public.invoices enable row level security;
alter table public.shop_settings enable row level security;
alter table public.invoice_counters enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated using (public.is_staff());
drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated with check (public.is_staff());
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated using (public.is_admin());

drop policy if exists repairs_select on public.repairs;
create policy repairs_select on public.repairs
  for select to authenticated using (public.is_staff());
drop policy if exists repairs_insert on public.repairs;
create policy repairs_insert on public.repairs
  for insert to authenticated with check (public.is_staff());
drop policy if exists repairs_update on public.repairs;
create policy repairs_update on public.repairs
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists repairs_delete on public.repairs;
create policy repairs_delete on public.repairs
  for delete to authenticated using (public.is_admin());

drop policy if exists prices_select on public.price_guide;
create policy prices_select on public.price_guide
  for select to authenticated using (public.is_staff());
drop policy if exists prices_insert on public.price_guide;
create policy prices_insert on public.price_guide
  for insert to authenticated with check (public.is_admin());
drop policy if exists prices_update on public.price_guide;
create policy prices_update on public.price_guide
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists prices_delete on public.price_guide;
create policy prices_delete on public.price_guide
  for delete to authenticated using (public.is_admin());

drop policy if exists time_select on public.time_entries;
create policy time_select on public.time_entries
  for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select to authenticated using (public.is_staff());

drop policy if exists shop_select on public.shop_settings;
create policy shop_select on public.shop_settings
  for select to authenticated using (public.is_staff());
drop policy if exists shop_update on public.shop_settings;
create policy shop_update on public.shop_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.repairs from anon, authenticated;
revoke all on table public.price_guide from anon, authenticated;
revoke all on table public.time_entries from anon, authenticated;
revoke all on table public.invoices from anon, authenticated;
revoke all on table public.shop_settings from anon, authenticated;
revoke all on table public.invoice_counters from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.repairs to authenticated;
grant select, insert, update, delete on public.price_guide to authenticated;
grant select on public.time_entries to authenticated;
grant select on public.invoices to authenticated;
grant select, update on public.shop_settings to authenticated;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.set_repair_code() from public;
revoke all on function public.touch_updated_at() from public;
revoke all on function public.quote_repair(text, text) from public;
revoke all on function public.list_catalog() from public;
revoke all on function public.shop_public() from public;
revoke all on function public.clock_in() from public;
revoke all on function public.clock_out() from public;
revoke all on function public.correct_time_entry(uuid, timestamptz, timestamptz, text) from public;
revoke all on function public.create_invoice_from_repair(uuid, text) from public;
revoke all on function public.set_employee(uuid, text, boolean) from public;
revoke all on function public.update_my_name(text) from public;

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.set_repair_code() to authenticated;
grant execute on function public.touch_updated_at() to authenticated;
grant execute on function public.quote_repair(text, text) to anon, authenticated;
grant execute on function public.list_catalog() to anon, authenticated;
grant execute on function public.shop_public() to anon, authenticated;
grant execute on function public.clock_in() to authenticated;
grant execute on function public.clock_out() to authenticated;
grant execute on function public.correct_time_entry(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.create_invoice_from_repair(uuid, text) to authenticated;
grant execute on function public.set_employee(uuid, text, boolean) to authenticated;
grant execute on function public.update_my_name(text) to authenticated;

notify pgrst, 'reload schema';
