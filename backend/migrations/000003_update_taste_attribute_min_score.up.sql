-- 000003_update_taste_attribute_min_score.up.sql
-- Update default min_score in taste_attributes to 0 (0 = ไม่มีเลย / None)

ALTER TABLE taste_attributes ALTER COLUMN min_score SET DEFAULT 0;

UPDATE taste_attributes 
SET min_score = 0 
WHERE min_score = 1;

UPDATE settings 
SET description_th = 'เกณฑ์คะแนนเฉลี่ยขั้นต่ำที่ถือว่าสูตรผ่าน (0-5)'
WHERE key = 'trial.passScoreThreshold';
