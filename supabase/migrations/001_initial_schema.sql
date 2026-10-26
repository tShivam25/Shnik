-- ==============================================================================
-- Shnik: Complete Production Database Schema & Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  bio text default '',
  avatar_url text default null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_full_name on public.profiles(full_name);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. Follows Table
-- ------------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  followee_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (follower_id, followee_id),
  constraint cant_follow_self check (follower_id != followee_id)
);

create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_followee on public.follows(followee_id);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow others"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ------------------------------------------------------------------------------
-- 3. Messages Table
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  status text not null default 'in_transit',
  verified boolean default null,
  session_id text default null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_recipient on public.messages(recipient_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);

alter table public.messages enable row level security;

create policy "Sender can view all their messages"
  on public.messages for select
  using (auth.uid() = sender_id);

create policy "Recipient can view messages once delivered"
  on public.messages for select
  using (auth.uid() = recipient_id and status = 'delivered');

create policy "Users can insert messages as sender"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Sender or Service can update messages"
  on public.messages for update
  using (auth.uid() = sender_id or auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 4. Posts Table
-- ------------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  caption text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

create policy "Users can create their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Post Likes Table
-- ------------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Likes are viewable by everyone"
  on public.post_likes for select
  using (true);

create policy "Users can like posts"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Post Comments Table
-- ------------------------------------------------------------------------------
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_post_comments_post_id on public.post_comments(post_id);

alter table public.post_comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.post_comments for select
  using (true);

create policy "Users can comment on posts"
  on public.post_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.post_comments for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. Alerts Table
-- ------------------------------------------------------------------------------
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_ids uuid[] not null,
  reason text not null,
  severity text not null check (severity in ('warning', 'critical')),
  message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_alerts_user_ids on public.alerts using gin(user_ids);

alter table public.alerts enable row level security;

create policy "Users can view alerts involving them"
  on public.alerts for select
  using (auth.uid() = any(user_ids));

create policy "Authenticated users or Service can insert alerts"
  on public.alerts for insert
  with check (auth.uid() = any(user_ids) or auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 8. Trigger for New User Signup
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_username text;
  raw_full_name text;
begin
  raw_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  raw_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', raw_username);

  insert into public.profiles (id, username, full_name, bio, avatar_url)
  values (
    new.id,
    raw_username,
    raw_full_name,
    coalesce(new.raw_user_meta_data->>'bio', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 9. Storage Buckets (Avatars & Posts)
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do update set public = true;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Post images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'posts');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated'
  );

create policy "Users can upload post images"
  on storage.objects for insert
  with check (
    bucket_id = 'posts' and
    auth.role() = 'authenticated'
  );

-- ------------------------------------------------------------------------------
-- 10. Realtime Publications
-- ------------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.follows;
alter publication supabase_realtime add table public.alerts;
