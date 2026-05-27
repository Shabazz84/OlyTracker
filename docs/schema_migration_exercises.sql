-- Exercise Catalog Migration
-- Run in Supabase SQL Editor BEFORE deploying the new app code.
-- Safe to run on live data — inserts new rows, deletes old ones, no data loss.

-- Step 1: Add exercise_id column
ALTER TABLE sets ADD COLUMN IF NOT EXISTS exercise_id text;

-- Step 2: Populate exercise_id from exercise_name via slug mapping
UPDATE sets SET exercise_id = CASE exercise_name
  WHEN 'Muscle_Snatch'                      THEN 'muscle_snatch'
  WHEN 'Muscle_Snatch_(opener)'             THEN 'muscle_snatch'
  WHEN 'Hang_Power_Snatch'                  THEN 'hang_power_snatch'
  WHEN 'Back_Squat'                         THEN 'back_squat'
  WHEN 'Back_Squat_—_Daily_Max_Single'      THEN 'back_squat'
  WHEN 'Overhead_Squat'                     THEN 'overhead_squat'
  WHEN 'Good_Morning'                       THEN 'good_morning'
  WHEN 'Weighted_Pull_Up'                   THEN 'weighted_pull_up'
  WHEN 'GHR_(Glute_Ham_Raise)'             THEN 'ghr'
  WHEN 'Hang_Power_Clean'                   THEN 'hang_power_clean'
  WHEN 'Clean_Pull'                         THEN 'clean_pull'
  WHEN 'Incline_Barbell_Press'             THEN 'incline_barbell_press'
  WHEN 'Weighted_Parallel_Bar_Dips'        THEN 'weighted_dips'
  WHEN 'Klokov_Trapi'                      THEN 'klokov_trapi'
  WHEN 'Wide_Overhead_Press'               THEN 'wide_overhead_press'
  WHEN 'Dead_Bug'                          THEN 'dead_bug'
  WHEN 'Snatch_Balance'                    THEN 'snatch_balance'
  WHEN 'Front_Squat'                       THEN 'front_squat'
  WHEN 'Front_Squat_—_Daily_Max_Single'    THEN 'front_squat'
  WHEN 'RDL_Pull'                          THEN 'rdl'
  WHEN 'Plank'                             THEN 'plank'
  WHEN 'Jerk_from_Rack_—_Daily_Max_Single' THEN 'jerk_from_rack'
  WHEN 'Push_Press'                        THEN 'push_press'
  WHEN 'Clean_&_Jerk'                      THEN 'clean_and_jerk'
  WHEN 'Sots_Press'                        THEN 'sots_press'
  WHEN 'Behind_Neck_Press'                 THEN 'behind_neck_press'
  WHEN 'Pallof_Press'                      THEN 'pallof_press'
  WHEN 'Klokov_Squat_—_Singles'           THEN 'klokov_squat'
  WHEN 'Berestov_Squat'                    THEN 'berestov_squat'
  WHEN 'Lunge_(Barbell)'                   THEN 'lunge'
  WHEN 'Face_Pull'                         THEN 'face_pull'
  WHEN 'Ab_Wheel_/_Rollout'                THEN 'ab_wheel'
  ELSE exercise_name
END
WHERE exercise_id IS NULL;

-- Step 3: Rebuild row IDs to use slug-based format
-- New ID format: sets_w{week}_{day_id}_{exercise_id}_{set_index}
-- Insert new rows with slug-based IDs
INSERT INTO sets (id, week, day_id, exercise_id, set_index, done, weight, updated_at)
SELECT
  CONCAT('sets_w', week, '_', day_id, '_', exercise_id, '_', set_index),
  week, day_id, exercise_id, set_index, done, weight, updated_at
FROM sets
WHERE id != CONCAT('sets_w', week, '_', day_id, '_', exercise_id, '_', set_index)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Delete old rows with name-based IDs
DELETE FROM sets
WHERE id != CONCAT('sets_w', week, '_', day_id, '_', exercise_id, '_', set_index);

-- Step 5: Make exercise_id NOT NULL and drop old column
ALTER TABLE sets ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE sets DROP COLUMN IF EXISTS exercise_name;

-- Step 6: Update index
DROP INDEX IF EXISTS idx_sets_week_day_exercise;
CREATE INDEX idx_sets_week_day_exercise ON sets(week, day_id, exercise_id);
