alter table public.chat_cache
  add column if not exists provider text not null default 'ollama',
  add column if not exists model text not null default 'qwen2.5-coder:7b';

create index if not exists chat_cache_provider_model_question_idx
  on public.chat_cache (provider, model, question);

grant select, insert, update
on table public.chat_cache
to service_role;
