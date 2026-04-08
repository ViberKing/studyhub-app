-- ============================================================
-- StudyHub Row Level Security Policies
-- REVIEW THIS before applying. Run AFTER SCHEMA.sql.
-- Every table gets RLS enabled + policies so users can only
-- access their own data.
-- ============================================================

-- ======================== PROFILES ========================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- INSERT handled by trigger (handle_new_user), not client
-- DELETE handled by server-side function (account deletion)

-- ======================== MODULES ========================
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own modules"
  ON modules FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== ASSIGNMENTS ========================
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assignments"
  ON assignments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== STUDY SESSIONS ========================
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
  ON study_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== DECKS ========================
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own decks"
  ON decks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== CARDS ========================
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cards"
  ON cards FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== GRADES ========================
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own grades"
  ON grades FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== CITATIONS ========================
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own citations"
  ON citations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== NOTES ========================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes"
  ON notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== RESEARCH PROJECTS ========================
ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own research projects"
  ON research_projects FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== RESEARCH SOURCES ========================
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own research sources"
  ON research_sources FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== ESSAY CHECKS ========================
ALTER TABLE essay_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own essay checks"
  ON essay_checks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== CALENDAR EVENTS ========================
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar events"
  ON calendar_events FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ======================== GROUPS ========================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Anyone can see public groups
CREATE POLICY "Anyone can read public groups"
  ON groups FOR SELECT
  USING (is_private = FALSE);

-- Members can see private groups they belong to
CREATE POLICY "Members can read their private groups"
  ON groups FOR SELECT
  USING (
    is_private = TRUE
    AND id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Any logged-in user can create a group
CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Only the creator can update/delete
CREATE POLICY "Creator can update group"
  ON groups FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete group"
  ON groups FOR DELETE
  USING (created_by = auth.uid());

-- ======================== GROUP MEMBERS ========================
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Members can see who else is in their groups
CREATE POLICY "Members can read group members"
  ON group_members FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Users can join public groups or be added to private ones
CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can leave groups (delete own membership)
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (user_id = auth.uid());

-- ======================== GROUP MESSAGES ========================
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Members can read messages in their groups
CREATE POLICY "Members can read group messages"
  ON group_messages FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Members can post to their groups
CREATE POLICY "Members can post group messages"
  ON group_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- ======================== DIRECT MESSAGES ========================
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can read DMs they sent or received
CREATE POLICY "Users can read own DMs"
  ON direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can send DMs only if they share a group with the receiver
CREATE POLICY "Users can send DMs to group-mates"
  ON direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND receiver_id IN (
      SELECT gm2.user_id FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id != auth.uid()
    )
  );

-- Users can mark their received DMs as read
CREATE POLICY "Users can update own received DMs"
  ON direct_messages FOR UPDATE
  USING (receiver_id = auth.uid());

-- ======================== FEED POSTS ========================
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- All logged-in users can read feed posts from their university
CREATE POLICY "Users can read uni feed"
  ON feed_posts FOR SELECT
  USING (
    university IN (SELECT university FROM profiles WHERE id = auth.uid())
  );

-- Users can create posts
CREATE POLICY "Users can create feed posts"
  ON feed_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete own posts
CREATE POLICY "Users can delete own posts"
  ON feed_posts FOR DELETE
  USING (user_id = auth.uid());

-- ======================== FEED REPLIES ========================
ALTER TABLE feed_replies ENABLE ROW LEVEL SECURITY;

-- Users can read replies on posts they can see
CREATE POLICY "Users can read feed replies"
  ON feed_replies FOR SELECT
  USING (
    post_id IN (SELECT id FROM feed_posts)
  );

-- Users can reply
CREATE POLICY "Users can create replies"
  ON feed_replies FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete own replies
CREATE POLICY "Users can delete own replies"
  ON feed_replies FOR DELETE
  USING (user_id = auth.uid());

-- ======================== REPORTS ========================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Users can see own reports
CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid());

-- ======================== BLOCKED USERS ========================
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks"
  ON blocked_users FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());
