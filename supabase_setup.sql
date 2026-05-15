-- 1. Create a table for user profiles linked to Supabase Auth
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  phone text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 2. Create a table for tracking user credits
create table public.credits (
  user_id uuid references auth.users not null primary key,
  balance integer default 20 not null, -- 20 free credits on signup
  total_purchased integer default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.credits enable row level security;

create policy "Users can view their own credits"
  on credits for select
  using ( auth.uid() = user_id );

-- 3. Trigger to automatically create profile and credits on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.phone,
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  
  insert into public.credits (user_id, balance)
  values (new.id, 20); -- Give 20 initial free credits
  
  return new;
end;
$$;

-- Attach trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Create a table for AI generations
create table public.generations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  status text not null default 'pending', -- pending, done, failed
  prompt text,
  model_settings jsonb,
  original_image_url text,
  generated_image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

alter table public.generations enable row level security;

create policy "Users can view their own generations"
  on generations for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own generations"
  on generations for insert
  with check ( auth.uid() = user_id );
