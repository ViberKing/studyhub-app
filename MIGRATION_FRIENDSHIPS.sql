-- MIGRATION: Friendships table for friend requests and friend lists
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.friendships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users see their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can accept/decline their incoming requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete friendships they're part of" ON public.friendships;

-- Policy: Users can see friendships where they are either user or friend
CREATE POLICY "Users see their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can send friend requests (insert where they are user_id)
CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can accept/decline requests sent to them (update where they are friend_id)
CREATE POLICY "Users can accept/decline their incoming requests" ON public.friendships
  FOR UPDATE USING (auth.uid() = friend_id);

-- Policy: Users can delete friendships they're part of
CREATE POLICY "Users can delete friendships they're part of" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
