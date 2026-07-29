-- Add foreign key so PostgREST can resolve anime_items → anime_cache nested select
alter table public.anime_items
  add constraint anime_items_subject_id_fkey
  foreign key (subject_id) references public.anime_cache(subject_id)
  on delete cascade;
