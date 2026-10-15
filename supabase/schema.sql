-- =====================================================================
--  Inventario de equipos de TI · CETA
--  Esquema para Supabase (PostgreSQL 15+)
--
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
--  Se puede ejecutar varias veces sin perder datos (es idempotente).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Perfiles de usuario y roles
--    pendiente → no ve nada hasta que un admin lo apruebe
--    lector    → solo consulta y exporta (sin claves de Windows)
--    editor    → crea, edita, traslada e importa equipos
--    admin     → todo lo anterior + eliminar, catálogos y usuarios
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  correo     text,
  nombre     text,
  rol        text not null default 'pendiente'
             check (rol in ('pendiente', 'lector', 'editor', 'admin')),
  creado_en  timestamptz not null default now()
);

-- Rol del usuario que hace la petición
create or replace function public.mi_rol()
returns text
language sql stable security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.puede_leer()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.mi_rol() in ('lector', 'editor', 'admin'), false);
$$;

create or replace function public.puede_editar()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.mi_rol() in ('editor', 'admin'), false);
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.mi_rol() = 'admin', false);
$$;

-- Cada usuario nuevo de Supabase Auth recibe un perfil.
-- El primer usuario del sistema queda como admin; los demás como "pendiente".
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_rol text := 'pendiente';
begin
  if not exists (select 1 from public.perfiles where rol = 'admin') then
    v_rol := 'admin';
  end if;

  insert into public.perfiles (id, correo, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    v_rol
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_crear_perfil on auth.users;
create trigger trg_crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ---------------------------------------------------------------------
-- 2. Catálogos (listas desplegables)
--    En "unidad", la columna extra guarda el tipo de área (Facultad/Administrativa)
-- ---------------------------------------------------------------------
create table if not exists public.catalogos (
  id      bigint generated always as identity primary key,
  tipo    text not null check (tipo in ('unidad', 'edificio', 'tipo_area', 'categoria_uso',
                                        'tipo_equipo', 'ups', 'estado')),
  valor   text not null,
  extra   text,
  orden   integer not null default 0,
  activo  boolean not null default true,
  unique (tipo, valor)
);

insert into public.catalogos (tipo, valor, orden) values
  ('tipo_area', 'Facultad', 1),
  ('tipo_area', 'Administrativa', 2),
  ('categoria_uso', 'Administrativas', 1),
  ('categoria_uso', 'Catedráticos', 2),
  ('categoria_uso', 'Laboratorios', 3),
  ('categoria_uso', 'Salones', 4),
  ('categoria_uso', 'Clínicas', 5),
  ('tipo_equipo', 'Desktop', 1),
  ('tipo_equipo', 'AIO', 2),
  ('tipo_equipo', 'Notebook', 3),
  ('tipo_equipo', 'Mini PC', 4),
  ('tipo_equipo', 'Tablet', 5),
  ('tipo_equipo', 'Workstation', 6),
  ('ups', 'Sí', 1),
  ('ups', 'No', 2),
  ('estado', 'En uso', 1),
  ('estado', 'En stock', 2),
  ('estado', 'En préstamo', 3),
  ('estado', 'En reparación', 4),
  ('estado', 'Pendiente de formateo', 5),
  ('estado', 'Para desecho', 6),
  ('estado', 'De baja', 7),
  ('estado', 'No localizado', 8)
on conflict (tipo, valor) do nothing;

-- ---------------------------------------------------------------------
-- 3. Equipos (una fila = una columna del Excel "Inventario")
-- ---------------------------------------------------------------------
create table if not exists public.equipos (
  id                 uuid primary key default gen_random_uuid(),
  -- Asignación y clasificación
  unidad             text,
  tipo_area          text,
  oficina            text,
  categoria_uso      text,
  encargado          text,
  -- Ubicación
  edificio           text,
  nivel              text,
  oficina_salon      text,
  -- Identificación
  numero_serie       text not null,
  nombre_equipo      text,
  tipo_equipo        text,
  -- Hardware
  procesador         text,
  ram                text,
  tarjeta_grafica    text,
  almacenamiento     text,
  -- SO (la clave de Windows vive en equipo_secretos)
  sistema_operativo  text,
  -- Red y acceso remoto
  mac_lan            text,
  mac_lan2           text,
  mac_wifi           text,
  ip                 text,
  mascara            text,
  puerta_enlace      text,
  dns_primario       text,
  teamviewer_id      text,
  -- Software, monitores, periféricos, compra
  extension          text,
  monitores          text,
  ups                text,
  orden_compra       text,
  -- Estado y ciclo de vida
  estado             text default 'En uso',
  pendiente          text,
  observaciones      text,
  -- Control
  creado_en          timestamptz not null default now(),
  creado_por         uuid,
  actualizado_en     timestamptz not null default now(),
  actualizado_por    uuid
);

create unique index if not exists equipos_numero_serie_uk on public.equipos (upper(numero_serie));
create unique index if not exists equipos_nombre_equipo_uk on public.equipos (upper(nombre_equipo))
  where nombre_equipo is not null and nombre_equipo <> '';
create index if not exists equipos_unidad_idx on public.equipos (unidad);
create index if not exists equipos_estado_idx on public.equipos (estado);

-- Datos sensibles: solo editor y admin pueden leerlos
create table if not exists public.equipo_secretos (
  equipo_id        uuid primary key references public.equipos (id) on delete cascade,
  clave_windows    text,
  actualizado_en   timestamptz not null default now(),
  actualizado_por  uuid
);

-- ---------------------------------------------------------------------
-- 4. Historial de cambios (no tiene FK para conservarse aunque se elimine el equipo)
-- ---------------------------------------------------------------------
create table if not exists public.historial (
  id              bigint generated always as identity primary key,
  equipo_id       uuid,
  numero_serie    text,
  nombre_equipo   text,
  accion          text not null check (accion in ('CREADO', 'EDITADO', 'TRASLADO', 'CAMBIO_ESTADO',
                                                  'IMPORTADO', 'ELIMINADO')),
  cambios         jsonb not null default '{}'::jsonb,
  motivo          text,
  usuario_id      uuid,
  usuario_nombre  text,
  fecha           timestamptz not null default now()
);

create index if not exists historial_equipo_idx on public.historial (equipo_id, fecha desc);
create index if not exists historial_fecha_idx on public.historial (fecha desc);

-- ---------------------------------------------------------------------
-- 5. Triggers: normalización y registro automático del historial
-- ---------------------------------------------------------------------

-- Convierte cualquier MAC (aa:bb:cc..., aabb.ccdd..., AABBCC...) a AA-BB-CC-DD-EE-FF
create or replace function public.normalizar_mac(p text)
returns text
language plpgsql immutable
as $$
declare
  v text;
begin
  if p is null or btrim(p) = '' then
    return null;
  end if;
  if btrim(p) ~* '^(n/?a|no tiene|no aplica|ninguno|ninguna|-)$' then
    return 'N/A';
  end if;
  v := upper(regexp_replace(p, '[^0-9A-Fa-f]', '', 'g'));
  if length(v) = 12 then
    return substr(v, 1, 2) || '-' || substr(v, 3, 2) || '-' || substr(v, 5, 2) || '-' ||
           substr(v, 7, 2) || '-' || substr(v, 9, 2) || '-' || substr(v, 11, 2);
  end if;
  return upper(btrim(p));
end;
$$;

create or replace function public.equipos_antes_de_guardar()
returns trigger
language plpgsql
as $$
begin
  new.numero_serie := upper(regexp_replace(new.numero_serie, '\s', '', 'g'));
  if new.numero_serie = '' then
    raise exception 'El número de serie es obligatorio';
  end if;
  new.nombre_equipo := nullif(upper(btrim(new.nombre_equipo)), '');
  new.mac_lan  := public.normalizar_mac(new.mac_lan);
  new.mac_lan2 := public.normalizar_mac(new.mac_lan2);
  new.mac_wifi := public.normalizar_mac(new.mac_wifi);

  if tg_op = 'INSERT' then
    new.creado_en  := now();
    new.creado_por := auth.uid();
  else
    new.creado_en  := old.creado_en;
    new.creado_por := old.creado_por;
  end if;
  new.actualizado_en  := clock_timestamp();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_equipos_antes on public.equipos;
create trigger trg_equipos_antes
  before insert or update on public.equipos
  for each row execute function public.equipos_antes_de_guardar();

-- Escribe en historial. La acción y el motivo se pueden indicar con
-- set_config('app.accion', ...) y set_config('app.motivo', ...) dentro de la transacción.
create or replace function public.equipos_registrar_historial()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_accion   text := nullif(current_setting('app.accion', true), '');
  v_motivo   text := nullif(current_setting('app.motivo', true), '');
  v_cambios  jsonb;
  v_nombre   text;
  v_ignorar  text[] := array['id', 'creado_en', 'creado_por', 'actualizado_en', 'actualizado_por'];
  v_fila     public.equipos;
begin
  select nombre into v_nombre from public.perfiles where id = auth.uid();

  if tg_op = 'INSERT' then
    v_fila := new;
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('antes', null, 'despues', n.value)), '{}'::jsonb)
      into v_cambios
      from jsonb_each(to_jsonb(new)) n
     where n.key <> all (v_ignorar)
       and n.value <> 'null'::jsonb
       and n.value <> '""'::jsonb;
    v_accion := coalesce(v_accion, 'CREADO');

  elsif tg_op = 'UPDATE' then
    v_fila := new;
    select jsonb_object_agg(n.key, jsonb_build_object('antes', o.value, 'despues', n.value))
      into v_cambios
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.key <> all (v_ignorar)
       and n.value is distinct from o.value;

    if v_cambios is null then
      return new;  -- no cambió nada real
    end if;

    if v_accion is null then
      if (select count(*) from jsonb_object_keys(v_cambios)) = 1 and v_cambios ? 'estado' then
        v_accion := 'CAMBIO_ESTADO';
      else
        v_accion := 'EDITADO';
      end if;
    end if;

  else -- DELETE
    v_fila := old;
    select coalesce(jsonb_object_agg(o.key, jsonb_build_object('antes', o.value, 'despues', null)), '{}'::jsonb)
      into v_cambios
      from jsonb_each(to_jsonb(old)) o
     where o.key <> all (v_ignorar)
       and o.value <> 'null'::jsonb;
    v_accion := 'ELIMINADO';
  end if;

  insert into public.historial (equipo_id, numero_serie, nombre_equipo, accion, cambios, motivo,
                                usuario_id, usuario_nombre)
  values (v_fila.id, v_fila.numero_serie, v_fila.nombre_equipo, v_accion, v_cambios, v_motivo,
          auth.uid(), v_nombre);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_equipos_historial on public.equipos;
create trigger trg_equipos_historial
  after insert or update or delete on public.equipos
  for each row execute function public.equipos_registrar_historial();

-- El historial de la clave de Windows nunca guarda el valor, solo que cambió
create or replace function public.secretos_registrar_historial()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_equipo  public.equipos;
  v_nombre  text;
  v_antes   text;
  v_despues text;
begin
  if tg_op = 'UPDATE' and new.clave_windows is not distinct from old.clave_windows then
    return new;
  end if;
  if current_setting('app.sin_historial_secreto', true) = '1' then
    return new;
  end if;

  select * into v_equipo from public.equipos where id = new.equipo_id;
  select nombre into v_nombre from public.perfiles where id = auth.uid();

  if tg_op = 'UPDATE' and old.clave_windows is not null and old.clave_windows <> '' then
    v_antes := '(oculta)';
  end if;
  if new.clave_windows is not null and new.clave_windows <> '' then
    v_despues := '(oculta)';
  end if;

  insert into public.historial (equipo_id, numero_serie, nombre_equipo, accion, cambios, motivo,
                                usuario_id, usuario_nombre)
  values (new.equipo_id, v_equipo.numero_serie, v_equipo.nombre_equipo,
          coalesce(nullif(current_setting('app.accion', true), ''), 'EDITADO'),
          jsonb_build_object('clave_windows', jsonb_build_object('antes', v_antes, 'despues', v_despues)),
          nullif(current_setting('app.motivo', true), ''),
          auth.uid(), v_nombre);
  return new;
end;
$$;

drop trigger if exists trg_secretos_historial on public.equipo_secretos;
create trigger trg_secretos_historial
  after insert or update on public.equipo_secretos
  for each row execute function public.secretos_registrar_historial();

-- ---------------------------------------------------------------------
-- 6. Funciones (RPC) que usa la aplicación para escribir.
--    Toda escritura pasa por aquí: valida el rol y deja el motivo en el historial.
-- ---------------------------------------------------------------------

-- Crea un equipo. p_datos es un objeto JSON con los nombres de columna.
create or replace function public.crear_equipo(p_datos jsonb, p_motivo text default null)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  r     public.equipos;
  v_id  uuid;
begin
  if not public.puede_editar() then
    raise exception 'No tiene permiso para crear equipos';
  end if;

  perform set_config('app.motivo', coalesce(p_motivo, ''), true);
  r := jsonb_populate_record(null::public.equipos, p_datos);

  insert into public.equipos (
    unidad, tipo_area, oficina, categoria_uso, encargado,
    edificio, nivel, oficina_salon,
    numero_serie, nombre_equipo, tipo_equipo,
    procesador, ram, tarjeta_grafica, almacenamiento, sistema_operativo,
    mac_lan, mac_lan2, mac_wifi, ip, mascara, puerta_enlace, dns_primario, teamviewer_id,
    extension, monitores, ups, orden_compra, estado, pendiente, observaciones
  ) values (
    r.unidad, r.tipo_area, r.oficina, r.categoria_uso, r.encargado,
    r.edificio, r.nivel, r.oficina_salon,
    r.numero_serie, r.nombre_equipo, r.tipo_equipo,
    r.procesador, r.ram, r.tarjeta_grafica, r.almacenamiento, r.sistema_operativo,
    r.mac_lan, r.mac_lan2, r.mac_wifi, r.ip, r.mascara, r.puerta_enlace, r.dns_primario, r.teamviewer_id,
    r.extension, r.monitores, r.ups, r.orden_compra, coalesce(r.estado, 'En uso'), r.pendiente, r.observaciones
  )
  returning id into v_id;

  if coalesce(p_datos ->> 'clave_windows', '') <> '' then
    -- La clave se anota en la misma entrada de historial de la creación
    perform set_config('app.sin_historial_secreto', '1', true);
    insert into public.equipo_secretos (equipo_id, clave_windows, actualizado_por)
    values (v_id, p_datos ->> 'clave_windows', auth.uid());
    perform set_config('app.sin_historial_secreto', '', true);

    update public.historial
       set cambios = cambios || jsonb_build_object('clave_windows',
                                  jsonb_build_object('antes', null, 'despues', '(oculta)'))
     where id = (select max(id) from public.historial where equipo_id = v_id);
  end if;

  return v_id;
end;
$$;

-- Actualiza solo las columnas que vienen en p_cambios.
--   p_accion  : EDITADO | TRASLADO | CAMBIO_ESTADO (para el historial)
--   p_version : actualizado_en que el usuario tenía en pantalla; si otro usuario guardó
--               antes, se rechaza para no pisar sus cambios.
create or replace function public.actualizar_equipo(
  p_id       uuid,
  p_cambios  jsonb,
  p_motivo   text default null,
  p_accion   text default null,
  p_version  timestamptz default null
)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v_actual  public.equipos;
  r         public.equipos;
  v_nuevo   timestamptz;
begin
  if not public.puede_editar() then
    raise exception 'No tiene permiso para modificar equipos';
  end if;

  select * into v_actual from public.equipos where id = p_id for update;
  if not found then
    raise exception 'El equipo ya no existe';
  end if;

  if p_version is not null and date_trunc('milliseconds', v_actual.actualizado_en) <> date_trunc('milliseconds', p_version) then
    raise exception 'CONFLICTO: otro usuario modificó este equipo. Recargue para ver los cambios.';
  end if;

  perform set_config('app.accion', coalesce(p_accion, ''), true);
  perform set_config('app.motivo', coalesce(p_motivo, ''), true);

  -- Parte del registro actual y sobrescribe solo las llaves recibidas
  r := jsonb_populate_record(v_actual, p_cambios - 'clave_windows');

  update public.equipos set
    unidad = r.unidad, tipo_area = r.tipo_area, oficina = r.oficina,
    categoria_uso = r.categoria_uso, encargado = r.encargado,
    edificio = r.edificio, nivel = r.nivel, oficina_salon = r.oficina_salon,
    numero_serie = r.numero_serie, nombre_equipo = r.nombre_equipo, tipo_equipo = r.tipo_equipo,
    procesador = r.procesador, ram = r.ram, tarjeta_grafica = r.tarjeta_grafica,
    almacenamiento = r.almacenamiento, sistema_operativo = r.sistema_operativo,
    mac_lan = r.mac_lan, mac_lan2 = r.mac_lan2, mac_wifi = r.mac_wifi, ip = r.ip,
    mascara = r.mascara, puerta_enlace = r.puerta_enlace, dns_primario = r.dns_primario,
    teamviewer_id = r.teamviewer_id, extension = r.extension, monitores = r.monitores,
    ups = r.ups, orden_compra = r.orden_compra, estado = r.estado,
    pendiente = r.pendiente, observaciones = r.observaciones
  where id = p_id
  returning actualizado_en into v_nuevo;

  if p_cambios ? 'clave_windows' then
    insert into public.equipo_secretos (equipo_id, clave_windows, actualizado_en, actualizado_por)
    values (p_id, nullif(p_cambios ->> 'clave_windows', ''), now(), auth.uid())
    on conflict (equipo_id) do update
      set clave_windows = excluded.clave_windows,
          actualizado_en = excluded.actualizado_en,
          actualizado_por = excluded.actualizado_por;
  end if;

  return coalesce(v_nuevo, v_actual.actualizado_en);
end;
$$;

-- Elimina un equipo (solo admin). Queda registrado en el historial.
create or replace function public.eliminar_equipo(p_id uuid, p_motivo text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede eliminar equipos';
  end if;
  perform set_config('app.motivo', coalesce(p_motivo, ''), true);
  delete from public.equipos where id = p_id;
end;
$$;

-- Importa filas del Excel. Si el número de serie ya existe, actualiza; si no, crea.
--   p_omitir_vacios = true → las celdas vacías del Excel no borran datos existentes
create or replace function public.importar_equipos(p_filas jsonb, p_omitir_vacios boolean default true)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_fila        jsonb;
  v_limpia      jsonb;
  v_id          uuid;
  v_serie       text;
  v_creados     integer := 0;
  v_actualizados integer := 0;
  v_errores     jsonb := '[]'::jsonb;
begin
  if not public.puede_editar() then
    raise exception 'No tiene permiso para importar';
  end if;

  for v_fila in select * from jsonb_array_elements(p_filas)
  loop
    v_serie := upper(regexp_replace(coalesce(v_fila ->> 'numero_serie', ''), '\s', '', 'g'));
    if v_serie = '' then
      continue;
    end if;

    if p_omitir_vacios then
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_limpia
        from jsonb_each(v_fila)
       where value <> 'null'::jsonb and value <> '""'::jsonb;
    else
      v_limpia := v_fila;
    end if;

    select id into v_id from public.equipos where upper(numero_serie) = v_serie;

    -- Cada fila en su propio bloque: si una falla, las demás se importan igual
    begin
      if v_id is null then
        perform set_config('app.accion', 'IMPORTADO', true);
        perform public.crear_equipo(v_limpia, 'Importado desde Excel');
        v_creados := v_creados + 1;
      else
        perform public.actualizar_equipo(v_id, v_limpia - 'numero_serie', 'Importado desde Excel', 'IMPORTADO', null);
        v_actualizados := v_actualizados + 1;
      end if;
    exception when others then
      v_errores := v_errores || jsonb_build_object('numero_serie', v_serie, 'error', sqlerrm);
    end;
  end loop;

  perform set_config('app.accion', '', true);
  return jsonb_build_object('creados', v_creados, 'actualizados', v_actualizados, 'errores', v_errores);
end;
$$;

-- Cambiar el rol de un usuario (solo admin)
create or replace function public.cambiar_rol(p_usuario uuid, p_rol text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  if p_usuario = auth.uid() and p_rol <> 'admin' then
    raise exception 'No puede quitarse a sí mismo el rol de administrador';
  end if;
  update public.perfiles set rol = p_rol where id = p_usuario;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Seguridad a nivel de fila (RLS)
--    Lectura según rol. Las escrituras de equipos solo pasan por las funciones de arriba.
-- ---------------------------------------------------------------------
alter table public.perfiles        enable row level security;
alter table public.catalogos       enable row level security;
alter table public.equipos         enable row level security;
alter table public.equipo_secretos enable row level security;
alter table public.historial       enable row level security;

drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.puede_leer());

drop policy if exists perfiles_editar_propio on public.perfiles;
create policy perfiles_editar_propio on public.perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and rol = public.mi_rol());

drop policy if exists catalogos_leer on public.catalogos;
create policy catalogos_leer on public.catalogos
  for select to authenticated using (public.puede_leer());

drop policy if exists catalogos_admin on public.catalogos;
create policy catalogos_admin on public.catalogos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists equipos_leer on public.equipos;
create policy equipos_leer on public.equipos
  for select to authenticated using (public.puede_leer());

drop policy if exists secretos_leer on public.equipo_secretos;
create policy secretos_leer on public.equipo_secretos
  for select to authenticated using (public.puede_editar());

drop policy if exists historial_leer on public.historial;
create policy historial_leer on public.historial
  for select to authenticated using (public.puede_leer());

revoke all on public.perfiles, public.catalogos, public.equipos, public.equipo_secretos, public.historial from anon;
grant select on public.perfiles, public.catalogos, public.equipos, public.equipo_secretos, public.historial to authenticated;
grant update (nombre) on public.perfiles to authenticated;
grant insert, update, delete on public.catalogos to authenticated;

revoke execute on function public.crear_equipo(jsonb, text) from anon, public;
revoke execute on function public.actualizar_equipo(uuid, jsonb, text, text, timestamptz) from anon, public;
revoke execute on function public.eliminar_equipo(uuid, text) from anon, public;
revoke execute on function public.importar_equipos(jsonb, boolean) from anon, public;
revoke execute on function public.cambiar_rol(uuid, text) from anon, public;
grant execute on function public.crear_equipo(jsonb, text) to authenticated;
grant execute on function public.actualizar_equipo(uuid, jsonb, text, text, timestamptz) to authenticated;
grant execute on function public.eliminar_equipo(uuid, text) to authenticated;
grant execute on function public.importar_equipos(jsonb, boolean) to authenticated;
grant execute on function public.cambiar_rol(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Tiempo real: la lista se actualiza sola cuando otro usuario guarda
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.equipos;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
