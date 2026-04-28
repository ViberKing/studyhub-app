-- MIGRATION: Ensure feed_posts and feed_replies tables exist with proper RLS
-- Run this in your Supabase SQL editor

-- ===========================
-- feed_posts table
-- ===========================
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  university TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add university column if table existed without it
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS university TEXT;

CREATE INDEX IF NOT EXISTS idx_feed_posts_university ON public.feed_posts(university);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON public.feed_posts(created_at DESC);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone signed in can read posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.feed_posts;

-- Anyone signed in can read all posts (the page filters client-side)
CREATE POLICY "Anyone signed in can read posts" ON public.feed_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create posts as themselves
CREATE POLICY "Users can create their own posts" ON public.feed_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON public.feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON public.feed_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- ===========================
-- feed_replies table
-- ===========================
CREATE TABLE IF NOT EXISTS public.feed_replies (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_replies_post ON public.feed_replies(post_id);

ALTER TABLE public.feed_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can read replies" ON public.feed_replies;
DROP POLICY IF EXISTS "Users can create replies" ON public.feed_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON public.feed_replies;

CREATE POLICY "Anyone signed in can read replies" ON public.feed_replies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create replies" ON public.feed_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" ON public.feed_replies
  FOR DELETE USING (auth.uid() = user_id);
