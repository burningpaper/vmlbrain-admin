-- Create sections table and add section_key to policies

create table if not exists sections (
  key text primary key,
  name text not null,
  icon text null,
  sort_order integer default 0
);

-- Add column to policies if it doesn't exist
alter table policies
  add column if not exists section_key text null references sections(key);

-- Optional: seed a few example sections (safe to rerun due to on conflict)
insert into sections (key, name, icon, sort_order) values
  ('about', 'About VML SA', 'building', 10),
  ('people', 'People & Culture', 'users', 20),
  ('ops', 'Client Operations', 'handshake', 30),
  ('policy', 'Policy & Governance', 'clipboard', 40),
  ('general', 'General Knowledge', 'book', 50)
on conflict (key) do update set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
