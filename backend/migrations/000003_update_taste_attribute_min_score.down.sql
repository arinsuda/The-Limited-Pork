-- 000003_update_taste_attribute_min_score.down.sql
ALTER TABLE taste_attributes ALTER COLUMN min_score SET DEFAULT 1;

UPDATE taste_attributes 
SET min_score = 1 
WHERE min_score = 0;

UPDATE settings 
SET description_th = 'เกณฑ์คะแนนเฉลี่ยขั้นต่ำที่ถือว่าสูตรผ่าน (1-5)'
WHERE key = 'trial.passScoreThreshold';
