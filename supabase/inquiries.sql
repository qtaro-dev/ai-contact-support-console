create table if not exists public.inquiries (
  id bigserial primary key,
  user_name text null,
  email text null,
  ip_address text null,
  user_agent text null,
  message text not null,
  answer text null,
  provider text not null default 'ollama',
  model text not null default 'qwen2.5-coder:7b',
  risk_level text not null default 'none',
  harassment_type text not null default 'other',
  harassment_categories jsonb not null default '[]'::jsonb,
  assessment_reasons jsonb not null default '[]'::jsonb,
  recommended_action text null,
  status text not null default 'new',
  admin_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiries_risk_level_check check (
    risk_level in ('none', 'low', 'medium', 'high')
  ),
  constraint inquiries_harassment_type_check check (
    harassment_type in (
      'stress_release',
      'misunderstanding',
      'aggressive',
      'distorted_justice',
      'persistent_attachment',
      'other'
    )
  ),
  constraint inquiries_status_check check (
    status in ('new', 'in_progress', 'escalated', 'resolved', 'on_hold')
  )
);

create index if not exists inquiries_created_at_idx
  on public.inquiries (created_at desc);

create index if not exists inquiries_risk_level_idx
  on public.inquiries (risk_level);

create index if not exists inquiries_harassment_type_idx
  on public.inquiries (harassment_type);

create index if not exists inquiries_status_idx
  on public.inquiries (status);

create index if not exists inquiries_email_idx
  on public.inquiries (email);

create index if not exists inquiries_ip_address_idx
  on public.inquiries (ip_address);

alter table public.inquiries enable row level security;

grant usage on schema public to service_role;

revoke all
on table public.inquiries
from anon, authenticated;

grant select, insert, update
on table public.inquiries
to service_role;

grant usage, select
on sequence public.inquiries_id_seq
to service_role;
