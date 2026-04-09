# SQL Queries

Example queries used across StudyHub for analytics, reporting, and data management.

---

## User Analytics

### Study hours per module (last 7 days)

```sql
SELECT
  module,
  SUM(minutes) AS total_minutes,
  COUNT(*) AS session_count,
  ROUND(AVG(minutes), 1) AS avg_session_length
FROM study_sessions
WHERE user_id = :user_id
  AND recorded_at >= NOW() - INTERVAL '7 days'
GROUP BY module
ORDER BY total_minutes DESC;
```

### Assignment completion rate by priority

```sql
SELECT
  priority,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE done = TRUE) AS completed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE done = TRUE) / COUNT(*), 1
  ) AS completion_pct
FROM assignments
WHERE user_id = :user_id
GROUP BY priority
ORDER BY
  CASE priority
    WHEN 'High' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'Low' THEN 3
  END;
```

### Weighted grade calculation per module

```sql
SELECT
  ROUND(
    SUM(score * weight / 100.0) / NULLIF(SUM(weight / 100.0), 0), 2
  ) AS weighted_average,
  SUM(weight) AS total_weight_covered,
  100 - SUM(weight) AS weight_remaining
FROM grades
WHERE user_id = :user_id;
```

---

## Community

### Most active groups by message volume (last 30 days)

```sql
SELECT
  g.name,
  COUNT(gm.id) AS message_count,
  COUNT(DISTINCT gm.user_id) AS active_members
FROM groups g
JOIN group_messages gm ON gm.group_id = g.id
WHERE gm.created_at >= NOW() - INTERVAL '30 days'
GROUP BY g.id, g.name
ORDER BY message_count DESC
LIMIT 10;
```

### Unread direct message count per conversation

```sql
SELECT
  sender_id,
  p.name AS sender_name,
  COUNT(*) AS unread_count
FROM direct_messages dm
JOIN profiles p ON p.id = dm.sender_id
WHERE dm.receiver_id = :user_id
  AND dm.read = FALSE
GROUP BY sender_id, p.name
ORDER BY unread_count DESC;
```

---

## Platform & Billing

### Active subscribers by plan and billing cycle

```sql
SELECT
  plan,
  billing,
  COUNT(*) AS user_count
FROM profiles
WHERE plan IN ('essential', 'plus', 'pro')
GROUP BY plan, billing
ORDER BY
  CASE plan
    WHEN 'pro' THEN 1
    WHEN 'plus' THEN 2
    WHEN 'essential' THEN 3
  END,
  billing;
```

### Trial users expiring within 48 hours

```sql
SELECT
  id,
  name,
  email,
  trial_ends_at,
  EXTRACT(HOURS FROM trial_ends_at - NOW()) AS hours_remaining
FROM profiles
WHERE plan = 'trial'
  AND trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
ORDER BY trial_ends_at ASC;
```

### Daily signups (last 30 days)

```sql
SELECT
  DATE(created_at) AS signup_date,
  COUNT(*) AS new_users,
  COUNT(*) FILTER (WHERE plan != 'trial') AS converted_same_day
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;
```

---

## Data Integrity

### Orphaned cards (cards without a valid deck)

```sql
SELECT c.id, c.term, c.definition
FROM cards c
LEFT JOIN decks d ON d.id = c.deck_id
WHERE d.id IS NULL;
```

### Users with study sessions but no modules

```sql
SELECT DISTINCT ss.user_id, p.name, p.email
FROM study_sessions ss
JOIN profiles p ON p.id = ss.user_id
LEFT JOIN modules m ON m.user_id = ss.user_id
WHERE m.id IS NULL;
```
