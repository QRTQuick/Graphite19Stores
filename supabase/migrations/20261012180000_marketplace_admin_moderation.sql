-- Admin review queue and seller feedback moderation.
alter table public.marketplace_sellers
  add column review_required boolean not null default false,
  add column review_reason text,
  add column review_started_at timestamptz,
  add column verified_at timestamptz,
  add column verified_by text;

alter table public.marketplace_listings
  add column review_reason text,
  add column reviewed_at timestamptz;

create table public.marketplace_seller_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  seller_id uuid not null references public.marketplace_sellers(user_id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (order_id, seller_id)
);

create index marketplace_sellers_review_queue_idx
  on public.marketplace_sellers (review_started_at asc) where review_required;
create index marketplace_listings_review_queue_idx
  on public.marketplace_listings (created_at asc) where status = 'pending';
create index marketplace_feedback_review_queue_idx
  on public.marketplace_seller_feedback (created_at asc) where status = 'open';
create index marketplace_order_items_seller_order_idx
  on public.marketplace_order_items (seller_id, order_id);

alter table public.marketplace_seller_feedback enable row level security;
revoke all on public.marketplace_seller_feedback from public, anon, authenticated;
grant all on public.marketplace_seller_feedback to service_role;
revoke insert on public.marketplace_listings from authenticated;
revoke insert (seller_id, category, brand, title, description, attributes, price, currency, condition, image_url, country_code, region, city)
  on public.marketplace_listings from authenticated;
revoke select on public.marketplace_sellers, public.marketplace_listings from anon, authenticated;
grant select (user_id, store_name, description, country_code, region, status, checkout_enabled, review_required, created_at, updated_at)
  on public.marketplace_sellers to anon, authenticated;
grant select (id, seller_id, category, brand, title, description, attributes, price, currency, condition, image_url, country_code, region, city, status, reserved_until, reserved_order_id, created_at, updated_at)
  on public.marketplace_listings to anon, authenticated;

drop policy "Visitors can view active listings and owners can view their listings" on public.marketplace_listings;
create policy "Visitors can view active listings and owners can view their listings"
  on public.marketplace_listings for select to anon, authenticated
  using (
    (status = 'active' and exists (
      select 1 from public.marketplace_sellers s
      where s.user_id = seller_id and s.status = 'approved' and not s.review_required
    ))
    or (select auth.uid()) = seller_id
  );

-- Called only by the trusted server API. Advisory locking makes the five-listing
-- cap and first-three auto-publish rule safe against simultaneous submissions.
create or replace function public.submit_marketplace_listing(p_seller_id uuid, p_listing jsonb, p_review_reason text default null)
returns public.marketplace_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_count integer;
  result public.marketplace_listings;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_seller_id::text, 19019));
  if not exists (
    select 1 from public.marketplace_sellers s
    where s.user_id = p_seller_id and s.status = 'approved' and not s.review_required
  ) then
    raise exception 'seller_not_eligible' using errcode = '42501';
  end if;
  select count(*) into listing_count from public.marketplace_listings l
    where l.seller_id = p_seller_id and l.status in ('active', 'pending', 'reserved');
  if listing_count >= 5 then
    raise exception 'listing_limit_reached' using errcode = '23514';
  end if;
  insert into public.marketplace_listings (
    seller_id, category, brand, title, description, attributes, price, currency,
    condition, image_url, country_code, region, city, status, review_reason
  ) values (
    p_seller_id, p_listing->>'category', coalesce(nullif(p_listing->>'brand', ''), 'Unbranded'),
    p_listing->>'title', p_listing->>'description', coalesce(p_listing->'attributes', '{}'::jsonb),
    (p_listing->>'price')::numeric, coalesce(p_listing->>'currency', 'NGN'),
    coalesce(p_listing->>'condition', 'new'), p_listing->>'image_url',
    p_listing->>'country_code', p_listing->>'region', p_listing->>'city',
    case when listing_count < 3 and coalesce(p_review_reason, '') = '' then 'active' else 'pending' end,
    nullif(p_review_reason, '')
  ) returning * into result;
  return result;
end;
$$;
revoke all on function public.submit_marketplace_listing(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_marketplace_listing(uuid, jsonb, text) to service_role;

comment on table public.marketplace_seller_feedback is 'Buyer feedback for paid marketplace purchases; low ratings trigger seller review.';
