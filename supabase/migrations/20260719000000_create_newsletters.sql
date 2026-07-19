create table "public"."newsletters" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "parasha" text not null,
    "hebrew_date" text not null,
    "data" jsonb not null
);

alter table "public"."newsletters" enable row level security;

CREATE UNIQUE INDEX newsletters_pkey ON public.newsletters USING btree (id);

alter table "public"."newsletters" add constraint "newsletters_pkey" PRIMARY KEY using index "newsletters_pkey";

create policy "Enable insert for authenticated users only"
on "public"."newsletters"
as permissive
for insert
to authenticated
with check (true);

create policy "Enable read access for authenticated users"
on "public"."newsletters"
as permissive
for select
to authenticated
using (true);

create policy "Enable update for authenticated users only"
on "public"."newsletters"
as permissive
for update
to authenticated
using (true);

create policy "Enable delete for authenticated users only"
on "public"."newsletters"
as permissive
for delete
to authenticated
using (true);
