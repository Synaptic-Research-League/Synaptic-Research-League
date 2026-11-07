-- Ejecuta este script completo en Supabase: SQL Editor > New query > Run

-- 1. Perfiles (uno por cuenta)
create table if not exists public.profiles (
  id     uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol    text not null default 'estudiante' check (rol in ('estudiante','admin'))
);

-- 2. Artículos de cada estudiante
create table if not exists public.articulos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  titulo     text not null,
  estado     text not null default 'En redacción'
             check (estado in ('En redacción','Enviado','En revisión','Aceptado','Publicado','Rechazado')),
  updated_at timestamptz not null default now()
);

-- 3. Crear el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Función para saber si quien consulta es administrador
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin');
$$;

-- 5. Seguridad por fila (RLS): sin esto, cualquiera podría leer las tablas
alter table public.profiles  enable row level security;
alter table public.articulos enable row level security;

drop policy if exists "perfil propio o admin"   on public.profiles;
drop policy if exists "articulos propios o admin" on public.articulos;
drop policy if exists "admin gestiona articulos"  on public.articulos;

-- Cada estudiante solo lee su perfil; el admin lee todos
create policy "perfil propio o admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Cada estudiante solo lee sus artículos; el admin lee todos
create policy "articulos propios o admin" on public.articulos
  for select using (user_id = auth.uid() or public.is_admin());

-- Solo el admin crea, edita o borra artículos (los estudiantes no pueden cambiar su estado)
create policy "admin gestiona articulos" on public.articulos
  for all using (public.is_admin()) with check (public.is_admin());

-- 5b. Permisos explícitos (necesarios si desactivaste "Automatically expose new tables").
-- Solo usuarios con sesión iniciada; el visitante anónimo no tiene acceso. Las políticas de arriba filtran las filas.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.articulos to authenticated;
grant execute on function public.is_admin() to authenticated;

-- 6. Convertirte en administrador (cambia el correo y ejecuta DESPUÉS de crear tu cuenta en la página)
-- update public.profiles set rol = 'admin'
--   where id = (select id from auth.users where email = 'TU_CORREO@ejemplo.com');
