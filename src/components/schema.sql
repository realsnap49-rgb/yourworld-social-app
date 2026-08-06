create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text not null,
  caption text,
  type text check (type in ('reel', 'story')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);

create table if not exists public.chat_conversations (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  is_accepted boolean default false,
  secret_pin text,
  text_count integer default 0,
  photo_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_conversations enable row level security;
create policy "Users can view their conversations" on public.chat_conversations 
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can insert conversations" on public.chat_conversations 
  for insert with check (auth.uid() = sender_id);
create policy "Users can update their conversations" on public.chat_conversations 
  for update using (auth.uid() = sender_id or auth.uid() = receiver_id);

create table if not exists public.call_signals (
  id uuid default uuid_generate_v4() primary key,
  caller_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  type text check (type in ('offer', 'answer', 'ice-candidate', 'end')) not null,
  payload jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.call_signals enable row level security;
create policy "Users can manage call signals" on public.call_signals 
  for all using (auth.uid() = caller_id or auth.uid() = receiver_id);
