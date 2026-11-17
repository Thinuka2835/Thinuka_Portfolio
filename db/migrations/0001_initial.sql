-- 0001_initial — admin auth, site settings, structured content, media library.
-- Long-form content is NOT stored here; it lives in Markdown under /content.

-- ── Administrators (created only via `npm run admin -- create`) ──────────
create table admin_users (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique check (email = lower(email)),
  name                text not null default '',
  password_hash       text not null,
  disabled            boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  password_changed_at timestamptz not null default now(),
  last_login_at       timestamptz
);

-- Sessions store only a SHA-256 hash of the cookie token.
create table admin_sessions (
  id           text primary key,
  user_id      uuid not null references admin_users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip           text,
  user_agent   text
);
create index admin_sessions_user_idx on admin_sessions (user_id);
create index admin_sessions_expires_idx on admin_sessions (expires_at);

-- Login throttling
create table login_attempts (
  id         bigint generated always as identity primary key,
  email      text,
  ip         text,
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_email_idx on login_attempts (email, created_at);
create index login_attempts_ip_idx on login_attempts (ip, created_at);

-- ── Media library (binary files live in Cloudinary, never here) ──────────
create table media (
  id                uuid primary key default gen_random_uuid(),
  public_id         text not null unique,
  version           bigint not null,
  secure_url        text not null,
  format            text not null,
  width             integer not null,
  height            integer not null,
  bytes             integer not null,
  alt               text not null default '',
  original_filename text,
  created_by        uuid references admin_users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Site settings (single JSON document per key, e.g. 'profile') ─────────
create table site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references admin_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ── Ordered collections shown on the home page ───────────────────────────
create table social_links (
  id         uuid primary key default gen_random_uuid(),
  platform   text not null,
  label      text not null default '',
  url        text not null,
  visible    boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stats (
  id         uuid primary key default gen_random_uuid(),
  value      integer not null check (value >= 0),
  suffix     text not null default '',
  label      text not null,
  visible    boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon_key   text not null,
  visible    boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticker_items (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  visible    boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- An image used by a certification cannot be deleted (on delete restrict).
create table certifications (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  issuer     text not null default '',
  year       text not null default '',
  url        text not null default '',
  image_id   uuid references media(id) on delete restrict,
  visible    boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Audit trail of Markdown publishing ───────────────────────────────────
create table content_events (
  id           bigint generated always as identity primary key,
  action       text not null check (action in ('publish', 'update', 'unpublish', 'delete')),
  content_type text not null,
  slug         text not null,
  store        text not null,
  commit_sha   text,
  admin_id     uuid references admin_users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index content_events_created_idx on content_events (created_at desc);
