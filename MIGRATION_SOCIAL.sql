-- ============================================================
-- MIGRATION: Social tables (feed, groups, friendships)
-- Run this ONCE in your Supabase SQL editor
-- Safe to re-run — uses CREATE IF NOT EXISTS and DROP/CREATE for policies
-- ============================================================

-- ============================================================
-- FEED POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  university TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS university TEXT;

CREATE INDEX IF NOT EXISTS idx_feed_posts_university ON public.feed_posts(university);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON public.feed_posts(created_at DESC);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can read posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.feed_posts;

CREATE POLICY "Anyone signed in can read posts" ON public.feed_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create their own posts" ON public.feed_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.feed_posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FEED REPLIES
-- ============================================================
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

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_groups_created ON public.groups(created_at DESC);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can read public groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group owners can update" ON public.groups;
DROP POLICY IF EXISTS "Group owners can delete" ON public.groups;

CREATE POLICY "Anyone signed in can read public groups" ON public.groups
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group owners can update" ON public.groups
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Group owners can delete" ON public.groups
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can read members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Anyone signed in can read members" ON public.group_members
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- GROUP MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_messages (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.group_messages(group_id, created_at);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can post messages" ON public.group_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.group_messages;

CREATE POLICY "Members can read messages" ON public.group_messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid())
  );
CREATE POLICY "Members can post messages" ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own messages" ON public.group_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- DIRECT MESSAGES (one-to-one)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON public.direct_messages(receiver_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see their own DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Recipients can mark DMs as read" ON public.direct_messages;

CREATE POLICY "Users see their own DMs" ON public.direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send DMs" ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients can mark DMs as read" ON public.direct_messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can accept/decline their incoming requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete friendships they're part of" ON public.friendships;

CREATE POLICY "Users see their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can accept/decline their incoming requests" ON public.friendships
  FOR UPDATE USING (auth.uid() = friend_id);
CREATE POLICY "Users can delete friendships they're part of" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
