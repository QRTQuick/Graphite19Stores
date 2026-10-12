-- Initial Graphite19Stores multi-vendor marketplace schema.
-- Seller approval and listing moderation are performed by trusted staff.

create table public.marketplace_sellers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  store_name text not null check (char_length(store_name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region text not null check (char_length(region) between 1 and 120),
  seller_terms_version text not null default '2026-10-12-v2',
  seller_terms_accepted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  checkout_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.marketplace_sellers (user_id) on delete restrict,
  category text not null check (category in ('clothes', 'cars', 'pcs', 'watches', 'other')),
  brand text not null default 'Unbranded' check (char_length(brand) between 1 and 100),
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 10 and 10000),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  price numeric(12, 2) not null check (price > 0),
  currency text not null default 'NGN' check (currency in ('NGN', 'USD')),
  condition text not null default 'new' check (condition in ('new', 'used_like_new', 'used_good', 'used_fair')),
  image_url text not null check (char_length(image_url) <= 2048 and image_url ~ '^https://'),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region text not null check (char_length(region) between 1 and 120),
  city text not null check (char_length(city) between 1 and 120),
  status text not null default 'pending' check (status in ('pending', 'active', 'reserved', 'rejected', 'sold', 'removed')),
  reserved_until timestamptz,
  reserved_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now(),
  constraint marketplace_messages_distinct_users check (sender_id <> recipient_id)
);

create table public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete restrict,
  order_reference text not null unique,
  currency text not null check (currency in ('NGN', 'USD')),
  subtotal numeric(12, 2) not null check (subtotal > 0),
  shipping_total numeric(12, 2) not null default 0 check (shipping_total >= 0),
  total numeric(12, 2) not null check (total = subtotal + shipping_total),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  fulfillment_status text not null default 'pending' check (fulfillment_status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  flutterwave_transaction_id text,
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders (id) on delete cascade,
  listing_id uuid references public.marketplace_listings (id) on delete set null,
  seller_id uuid not null references public.marketplace_sellers (user_id) on delete restrict,
  item_title text not null,
  category text not null check (category in ('clothes', 'cars', 'pcs', 'watches', 'other')),
  quantity integer not null check (quantity between 1 and 100),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  currency text not null check (currency in ('NGN', 'USD')),
  created_at timestamptz not null default now()
);

alter table public.marketplace_listings
  add constraint marketplace_listings_reserved_order_fk
  foreign key (reserved_order_id) references public.marketplace_orders (id) on delete set null;

create table public.marketplace_listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('suspected_scam', 'counterfeit', 'prohibited_item', 'misleading_description', 'safety_concern', 'other')),
  details text not null default '' check (char_length(details) <= 3000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index marketplace_listings_public_category_created_idx
  on public.marketplace_listings (category, created_at desc)
  where status = 'active';
create index marketplace_listings_seller_created_idx
  on public.marketplace_listings (seller_id, created_at desc);
create index marketplace_sellers_approved_idx
  on public.marketplace_sellers (user_id)
  where status = 'approved';
create index marketplace_messages_recipient_created_idx
  on public.marketplace_messages (recipient_id, created_at desc);
create index marketplace_messages_sender_created_idx
  on public.marketplace_messages (sender_id, created_at desc);
create index marketplace_orders_buyer_created_idx
  on public.marketplace_orders (buyer_id, created_at desc);
create index marketplace_order_items_order_idx
  on public.marketplace_order_items (order_id);
create index marketplace_order_items_seller_idx
  on public.marketplace_order_items (seller_id, created_at desc);
create unique index marketplace_orders_flutterwave_transaction_unique_idx
  on public.marketplace_orders (flutterwave_transaction_id)
  where flutterwave_transaction_id is not null;
create index marketplace_listing_reports_status_created_idx
  on public.marketplace_listing_reports (status, created_at desc);

alter table public.marketplace_sellers enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_messages enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_order_items enable row level security;
alter table public.marketplace_listing_reports enable row level security;

revoke all on public.marketplace_sellers from public, anon, authenticated;
revoke all on public.marketplace_listings from public, anon, authenticated;
revoke all on public.marketplace_messages from public, anon, authenticated;
revoke all on public.marketplace_orders from public, anon, authenticated;
revoke all on public.marketplace_order_items from public, anon, authenticated;
revoke all on public.marketplace_listing_reports from public, anon, authenticated;
grant all on public.marketplace_sellers, public.marketplace_listings, public.marketplace_messages,
  public.marketplace_orders, public.marketplace_order_items,
  public.marketplace_listing_reports to service_role;
grant select on public.marketplace_sellers to anon, authenticated;
grant insert (user_id, store_name, description, country_code, region, seller_terms_version)
  on public.marketplace_sellers to authenticated;
grant update (store_name, description, country_code, region, updated_at)
  on public.marketplace_sellers to authenticated;
grant select on public.marketplace_listings to anon, authenticated;
grant insert (seller_id, category, brand, title, description, attributes, price, currency, condition, image_url, country_code, region, city)
  on public.marketplace_listings to authenticated;
grant update (category, brand, title, description, attributes, price, currency, condition, image_url, country_code, region, city, updated_at)
  on public.marketplace_listings to authenticated;
grant select on public.marketplace_messages to authenticated;
grant insert (listing_id, sender_id, recipient_id, body)
  on public.marketplace_messages to authenticated;

create policy "Approved stores and owners can view seller profiles"
  on public.marketplace_sellers for select to anon, authenticated
  using (status = 'approved' or (select auth.uid()) = user_id);
create policy "Users can apply to become sellers"
  on public.marketplace_sellers for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending' and seller_terms_version = '2026-10-12-v2');
create policy "Sellers can edit their store details"
  on public.marketplace_sellers for update to authenticated
  using ((select auth.uid()) = user_id and status <> 'suspended')
  with check ((select auth.uid()) = user_id and status <> 'suspended');

create policy "Visitors can view active listings and owners can view their listings"
  on public.marketplace_listings for select to anon, authenticated
  using (
    (status = 'active' and exists (
      select 1 from public.marketplace_sellers s
      where s.user_id = seller_id and s.status = 'approved'
    ))
    or (select auth.uid()) = seller_id
  );
create policy "Approved sellers can submit listings for review"
  on public.marketplace_listings for insert to authenticated
  with check (
    (select auth.uid()) = seller_id
    and status = 'pending'
    and exists (
      select 1 from public.marketplace_sellers s
      where s.user_id = (select auth.uid()) and s.status = 'approved'
    )
  );
create policy "Sellers can edit their unsold listings"
  on public.marketplace_listings for update to authenticated
  using (
    (select auth.uid()) = seller_id
    and status in ('pending', 'active')
  )
  with check (
    (select auth.uid()) = seller_id
    and status in ('pending', 'active')
  );

create policy "Message participants can read their marketplace messages"
  on public.marketplace_messages for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
create policy "Buyers and sellers can message about active listings"
  on public.marketplace_messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.status = 'active'
      and (
        (l.seller_id = recipient_id and sender_id <> l.seller_id)
        or (l.seller_id = sender_id and recipient_id <> l.seller_id)
      )
    )
  );
create policy "Signed-in users can report other active listings"
  on public.marketplace_listing_reports for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.status = 'active' and l.seller_id <> (select auth.uid())
    )
  );

comment on table public.marketplace_sellers is 'Seller storefront profiles; approval status is changed only by trusted administrators.';
comment on table public.marketplace_listings is 'Marketplace listings; newly submitted listings remain pending until staff approval.';
comment on table public.marketplace_messages is 'Private buyer and seller messages scoped to an active marketplace listing.';
comment on table public.marketplace_orders is 'Payment and shipping records, writable only by trusted server-side payment code.';
comment on table public.marketplace_order_items is 'Immutable order line snapshots, writable only by trusted server-side payment code.';
comment on table public.marketplace_listing_reports is 'Buyer-submitted listing reports; review and status changes are server-side only.';
