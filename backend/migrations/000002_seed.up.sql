-- 000002_seed.up.sql

-- 1. Permissions
INSERT INTO permissions (code, description_th, description_en, group_name) VALUES
    ('users.read', 'ดูรายชื่อผู้ใช้และสิทธิ์', 'View users and roles', 'users'),
    ('users.write', 'จัดการผู้ใช้และกำหนดสิทธิ์', 'Manage users and assign roles', 'users'),
    ('masterdata.read', 'ดูข้อมูลหลัก (หน่วย, มิติรสชาติ, ขั้นตอน)', 'View master data', 'masterdata'),
    ('masterdata.write', 'จัดการข้อมูลหลัก', 'Manage master data', 'masterdata'),
    ('settings.read', 'ดูการตั้งค่าระบบ', 'View system settings', 'settings'),
    ('settings.write', 'แก้ไขการตั้งค่าระบบ', 'Manage system settings', 'settings'),
    ('recipes.read', 'ดูสูตรหมูกรอบ', 'View recipes', 'recipes'),
    ('recipes.write', 'สร้างและแก้ไขสูตรหมูกรอบ', 'Create and edit recipes', 'recipes'),
    ('recipes.approve', 'อนุมัติสูตรหมูกรอบ', 'Approve recipes', 'recipes'),
    ('trials.read', 'ดูผลการทดสอบหมูกรอบ', 'View trials', 'trials'),
    ('trials.write', 'บันทึกและแก้ไขผลทดสอบ', 'Create and edit trials', 'trials'),
    ('trials.evaluate', 'ชิมและให้คะแนนรสชาติ', 'Evaluate and rate taste', 'trials'),
    ('files.upload', 'อัปโหลดรูปภาพและไฟล์', 'Upload files and images', 'files'),
    ('audit.read', 'ดูประวัติการใช้งาน (Audit Logs)', 'View audit logs', 'audit')
ON CONFLICT (code) DO NOTHING;

-- 2. Roles
INSERT INTO roles (id, code, name_th, name_en, created_at, updated_at) VALUES
    ('01925b30-0001-7000-8000-000000000001', 'OWNER', 'เจ้าของร้าน (Owner)', 'Owner', NOW(), NOW()),
    ('01925b30-0002-7000-8000-000000000002', 'MANAGER', 'ผู้จัดการ (Manager)', 'Manager', NOW(), NOW()),
    ('01925b30-0003-7000-8000-000000000003', 'COOK', 'เชฟ / ช่างทอด (Cook)', 'Cook', NOW(), NOW()),
    ('01925b30-0004-7000-8000-000000000004', 'CASHIER', 'พนักงานขาย (Cashier)', 'Cashier', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Role Permissions: OWNER gets ALL permissions
INSERT INTO role_permissions (role_id, permission_code)
SELECT '01925b30-0001-7000-8000-000000000001', code FROM permissions
ON CONFLICT DO NOTHING;

-- MANAGER permissions
INSERT INTO role_permissions (role_id, permission_code) VALUES
    ('01925b30-0002-7000-8000-000000000002', 'masterdata.read'),
    ('01925b30-0002-7000-8000-000000000002', 'masterdata.write'),
    ('01925b30-0002-7000-8000-000000000002', 'settings.read'),
    ('01925b30-0002-7000-8000-000000000002', 'recipes.read'),
    ('01925b30-0002-7000-8000-000000000002', 'recipes.write'),
    ('01925b30-0002-7000-8000-000000000002', 'recipes.approve'),
    ('01925b30-0002-7000-8000-000000000002', 'trials.read'),
    ('01925b30-0002-7000-8000-000000000002', 'trials.write'),
    ('01925b30-0002-7000-8000-000000000002', 'trials.evaluate'),
    ('01925b30-0002-7000-8000-000000000002', 'files.upload'),
    ('01925b30-0002-7000-8000-000000000002', 'audit.read')
ON CONFLICT DO NOTHING;

-- COOK permissions
INSERT INTO role_permissions (role_id, permission_code) VALUES
    ('01925b30-0003-7000-8000-000000000003', 'masterdata.read'),
    ('01925b30-0003-7000-8000-000000000003', 'recipes.read'),
    ('01925b30-0003-7000-8000-000000000003', 'recipes.write'),
    ('01925b30-0003-7000-8000-000000000003', 'trials.read'),
    ('01925b30-0003-7000-8000-000000000003', 'trials.write'),
    ('01925b30-0003-7000-8000-000000000003', 'trials.evaluate'),
    ('01925b30-0003-7000-8000-000000000003', 'files.upload')
ON CONFLICT DO NOTHING;

-- 3. Base Units
INSERT INTO units (id, code, symbol, dimension, base_unit_id, factor_to_base, name_th, name_en, sort_order, is_active) VALUES
    ('01925b31-0001-7000-8000-000000000001', 'G', 'g', 'MASS', NULL, 1.0, 'กรัม', 'Gram', 1, true),
    ('01925b31-0002-7000-8000-000000000002', 'KG', 'kg', 'MASS', '01925b31-0001-7000-8000-000000000001', 1000.0, 'กิโลกรัม', 'Kilogram', 2, true),
    ('01925b31-0003-7000-8000-000000000003', 'ML', 'ml', 'VOLUME', NULL, 1.0, 'มิลลิลิตร', 'Milliliter', 3, true),
    ('01925b31-0004-7000-8000-000000000004', 'L', 'L', 'VOLUME', '01925b31-0003-7000-8000-000000000003', 1000.0, 'ลิตร', 'Liter', 4, true),
    ('01925b31-0005-7000-8000-000000000005', 'TBSP', 'ชต.', 'VOLUME', '01925b31-0003-7000-8000-000000000003', 15.0, 'ช้อนโต๊ะ', 'Tablespoon', 5, true),
    ('01925b31-0006-7000-8000-000000000006', 'TSP', 'ชช.', 'VOLUME', '01925b31-0003-7000-8000-000000000003', 5.0, 'ช้อนชา', 'Teaspoon', 6, true),
    ('01925b31-0007-7000-8000-000000000007', 'PCS', 'ชิ้น', 'COUNT', NULL, 1.0, 'ชิ้น/แผ่น', 'Pieces', 7, true),
    ('01925b31-0008-7000-8000-000000000008', 'CELSIUS', '°C', 'TEMPERATURE', NULL, 1.0, 'องศาเซลเซียส', 'Celsius', 8, true),
    ('01925b31-0009-7000-8000-000000000009', 'MINUTE', 'นาที', 'TIME', NULL, 1.0, 'นาที', 'Minute', 9, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Taste Attributes (min_score 0, max_score 5, customizable via UI: 0 = ไม่มีเลย / None)
INSERT INTO taste_attributes (id, code, name_th, name_en, description_th, description_en, min_score, max_score, color, sort_order, is_active) VALUES
    ('01925b32-0001-7000-8000-000000000001', 'CRISPINESS', 'ความกรอบ', 'Crispiness', 'ความกรอบฟูของหนังหมู กรอบนาน ไม่เหนียว (0 = ไม่กรอบเลย, 5 = กรอบฟูสนั่น)', 'Crispiness of the pork skin (0 = Not crispy at all, 5 = Extremely crispy)', 0, 5, '#eab308', 1, true),
    ('01925b32-0002-7000-8000-000000000002', 'UMAMI', 'นัว / กลมกล่อม', 'Umami', 'ความกลมกล่อม ความเข้มข้นรสเนื้อและเครื่องหมัก (0 = ไม่มีรสนัวเลย, 5 = กลมกล่อมที่สุด)', 'Savory depth and richness (0 = No umami, 5 = Rich & deep umami)', 0, 5, '#f97316', 2, true),
    ('01925b32-0003-7000-8000-000000000003', 'SALTY', 'เค็ม', 'Salty', 'ความพอดีของรสเค็ม (0 = ไม่เค็มเลย/จืดสนิท, 5 = เค็มมาก)', 'Saltiness balance (0 = Not salty at all, 5 = Very salty)', 0, 5, '#3b82f6', 3, true),
    ('01925b32-0004-7000-8000-000000000004', 'SWEET', 'หวาน', 'Sweet', 'ความหวานธรรมชาติจากเนื้อหมูหรือซอสหมัก (0 = ไม่หวานเลย, 5 = หวานมาก)', 'Natural sweetness (0 = Not sweet at all, 5 = Very sweet)', 0, 5, '#ec4899', 4, true),
    ('01925b32-0005-7000-8000-000000000005', 'SOUR', 'เปรี้ยว', 'Sour', 'ความเปรี้ยวจากน้ำส้มสายชูที่ทาหนัง (0 = ไม่มีรสเปรี้ยวเลย, 5 = เปรี้ยวมาก)', 'Sourness level (0 = No sourness, 5 = Very sour)', 0, 5, '#84cc16', 5, true),
    ('01925b32-0006-7000-8000-000000000006', 'SPICY', 'เผ็ด', 'Spicy', 'ความเผ็ดร้อนจากพริกไทยหรือเครื่องเทศ (0 = ไม่เผ็ดเลย, 5 = เผ็ดมาก)', 'Spiciness from pepper/spices (0 = Not spicy at all, 5 = Very spicy)', 0, 5, '#ef4444', 6, true),
    ('01925b32-0007-7000-8000-000000000007', 'TENDERNESS', 'ความนุ่มของเนื้อ', 'Tenderness', 'เนื้อหมูชุ่มฉ่ำ ไม่แห้งแข็งหรือเหนียว (0 = แข็ง/เหนียวมากไม่นุ่มเลย, 5 = นุ่มละมุนที่สุด)', 'Moistness and tenderness of the meat (0 = Very tough/not tender, 5 = Extremely tender)', 0, 5, '#a855f7', 7, true),
    ('01925b32-0008-7000-8000-000000000008', 'AROMA', 'ความหอม', 'Aroma', 'กลิ่นหอมของหมูทอดและเครื่องเทศ (0 = ไม่มีกลิ่นหอมเลย, 5 = หอมฟุ้งน่ารับประทาน)', 'Pleasant aroma of freshly fried pork (0 = No aroma, 5 = Highly aromatic)', 0, 5, '#14b8a6', 8, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Lookup Categories & Lookups
INSERT INTO lookup_categories (code, name_th, name_en, is_system) VALUES
    ('PIG_ORIENTATION', 'ทิศทางการวางหมู', 'Pork Orientation', true),
    ('OIL_TYPE', 'ชนิดน้ำมันที่ใช้ทอด', 'Frying Oil Type', true),
    ('WEATHER', 'สภาพอากาศขณะตาก/พัก', 'Weather Condition', true),
    ('INGREDIENT_CATEGORY', 'หมวดหมู่วัตถุดิบ', 'Ingredient Category', true),
    ('RECIPE_TAG', 'แท็กสูตร', 'Recipe Tag', true)
ON CONFLICT (code) DO NOTHING;

-- Pig Orientation
INSERT INTO lookups (id, category, code, name_th, name_en, metadata, sort_order) VALUES
    ('01925b33-0001-7000-8000-000000000001', 'PIG_ORIENTATION', 'SKIN_UP', 'หนังหงายขึ้น (เอาเนื้อลง)', 'Skin Facing Up', '{"icon":"arrow-up"}'::jsonb, 1),
    ('01925b33-0002-7000-8000-000000000002', 'PIG_ORIENTATION', 'SKIN_DOWN', 'หนังคว่ำลง (แช่น้ำมัน/แนบกระทะ)', 'Skin Facing Down', '{"icon":"arrow-down"}'::jsonb, 2),
    ('01925b33-0003-7000-8000-000000000003', 'PIG_ORIENTATION', 'SIDE', 'ตะแคงข้าง', 'Side Facing', '{"icon":"arrow-right"}'::jsonb, 3),
    ('01925b33-0004-7000-8000-000000000004', 'PIG_ORIENTATION', 'FLIP', 'พลิกกลับไปมาสม่ำเสมอ', 'Alternating / Flipping', '{"icon":"refresh-cw"}'::jsonb, 4)
ON CONFLICT (id) DO NOTHING;

-- Oil Type
INSERT INTO lookups (id, category, code, name_th, name_en, metadata, sort_order) VALUES
    ('01925b33-0011-7000-8000-000000000001', 'OIL_TYPE', 'PALM', 'น้ำมันปาล์ม (ทอดกรอบ ทนความร้อนสูง)', 'Palm Oil', '{}'::jsonb, 1),
    ('01925b33-0012-7000-8000-000000000002', 'OIL_TYPE', 'LARD', 'น้ำมันหมูแท้ (หอมโบราณ นัวมาก)', 'Pure Pork Lard', '{}'::jsonb, 2),
    ('01925b33-0013-7000-8000-000000000003', 'OIL_TYPE', 'RICE_BRAN', 'น้ำมันรำข้าว (สุขภาพดี จุดเกิดควันสูง)', 'Rice Bran Oil', '{}'::jsonb, 3),
    ('01925b33-0014-7000-8000-000000000004', 'OIL_TYPE', 'SOYBEAN', 'น้ำมันถั่วเหลือง', 'Soybean Oil', '{}'::jsonb, 4)
ON CONFLICT (id) DO NOTHING;

-- Weather
INSERT INTO lookups (id, category, code, name_th, name_en, metadata, sort_order) VALUES
    ('01925b33-0021-7000-8000-000000000001', 'WEATHER', 'SUNNY', 'แดดจัด ฟ้าโปร่ง (แดดดี หนังแห้งไว)', 'Sunny & Clear', '{}'::jsonb, 1),
    ('01925b33-0022-7000-8000-000000000002', 'WEATHER', 'CLOUDY', 'มีเมฆมาก แดดรำไร', 'Cloudy', '{}'::jsonb, 2),
    ('01925b33-0023-7000-8000-000000000003', 'WEATHER', 'RAINY', 'ฝนตก ชื้นสูง (หนังแห้งช้า)', 'Rainy', '{}'::jsonb, 3),
    ('01925b33-0024-7000-8000-000000000004', 'WEATHER', 'HUMID', 'อบอ้าว ความชื้นสัมพัทธ์สูง', 'Humid', '{}'::jsonb, 4)
ON CONFLICT (id) DO NOTHING;

-- Ingredient Categories
INSERT INTO lookups (id, category, code, name_th, name_en, metadata, sort_order) VALUES
    ('01925b33-0031-7000-8000-000000000001', 'INGREDIENT_CATEGORY', 'MEAT', 'เนื้อสัตว์', 'Meat', '{}'::jsonb, 1),
    ('01925b33-0032-7000-8000-000000000002', 'INGREDIENT_CATEGORY', 'SEASONING', 'เครื่องปรุงรส', 'Seasoning', '{}'::jsonb, 2),
    ('01925b33-0033-7000-8000-000000000003', 'INGREDIENT_CATEGORY', 'SPICE', 'เครื่องเทศและสมุนไพร', 'Spices & Herbs', '{}'::jsonb, 3),
    ('01925b33-0034-7000-8000-000000000004', 'INGREDIENT_CATEGORY', 'OIL', 'น้ำมันทอด', 'Frying Oil', '{}'::jsonb, 4),
    ('01925b33-0035-7000-8000-000000000005', 'INGREDIENT_CATEGORY', 'SAUCE', 'น้ำจิ้ม / เครื่องเคียง', 'Sauce & Condiments', '{}'::jsonb, 5),
    ('01925b33-0036-7000-8000-000000000006', 'INGREDIENT_CATEGORY', 'PACKAGING', 'บรรจุภัณฑ์', 'Packaging', '{}'::jsonb, 6),
    ('01925b33-0037-7000-8000-000000000007', 'INGREDIENT_CATEGORY', 'OTHER', 'อื่นๆ', 'Other', '{}'::jsonb, 7)
ON CONFLICT (id) DO NOTHING;

-- Recipe Tags
INSERT INTO lookups (id, category, code, name_th, name_en, metadata, sort_order) VALUES
    ('01925b33-0041-7000-8000-000000000001', 'RECIPE_TAG', 'SIGNATURE', 'สูตรซิกเนเจอร์ (ขายดี)', 'Signature', '{}'::jsonb, 1),
    ('01925b33-0042-7000-8000-000000000002', 'RECIPE_TAG', 'CHINESE_STYLE', 'สไตล์ฮ่องกง / จีนโบราณ', 'Cantonese / Hong Kong Style', '{}'::jsonb, 2),
    ('01925b33-0043-7000-8000-000000000003', 'RECIPE_TAG', 'THAI_STREET', 'สไตล์สตรีทฟู้ดไทย', 'Thai Street Style', '{}'::jsonb, 3),
    ('01925b33-0044-7000-8000-000000000004', 'RECIPE_TAG', 'AIR_FRYER', 'สูตรหม้อทอดไร้น้ำมัน', 'Air Fryer Recipe', '{}'::jsonb, 4),
    ('01925b33-0045-7000-8000-000000000005', 'RECIPE_TAG', 'EXPERIMENT', 'สูตรทดลองใหม่', 'Experimental', '{}'::jsonb, 5),
    ('01925b33-0046-7000-8000-000000000006', 'RECIPE_TAG', 'DIPPING_SAUCE', 'สูตรน้ำจิ้ม / ซอสเครื่องเคียง', 'Dipping Sauce / Condiments', '{}'::jsonb, 6)
ON CONFLICT (id) DO NOTHING;

-- 6. Process Step Types
INSERT INTO process_step_types (id, code, name_th, name_en, icon, uses_temperature, uses_duration, uses_orientation, is_repeatable, param_schema, sort_order, is_active) VALUES
    ('01925b34-0001-7000-8000-000000000001', 'PREP', 'เตรียมวัตถุดิบและล้างทำความสะอาด', 'Preparation & Cleaning', 'utensils', false, false, false, false, '[]'::jsonb, 1, true),
    ('01925b34-0002-7000-8000-000000000002', 'BOIL', 'ต้ม / ลวกเนื้อหมู', 'Boiling / Blanching', 'flame', true, true, true, false, '[{"key":"saltAddedGrams","labelTh":"เกลือที่ใส่ในน้ำต้ม (กรัม)","labelEn":"Salt in boiling water (g)","type":"number","required":false}]'::jsonb, 2, true),
    ('01925b34-0003-7000-8000-000000000003', 'SCORE_SKIN', 'จิ้มหนังและบั้งเนื้อ', 'Skin Pricking & Scoring', 'needle', false, false, false, false, '[{"key":"needleDensity","labelTh":"ความถี่ในการจิ้ม (ถี่มาก/ปานกลาง)","labelEn":"Pricking Density","type":"text","required":false}]'::jsonb, 3, true),
    ('01925b34-0004-7000-8000-000000000004', 'MARINATE', 'หมักเนื้อและทาเกลือ/น้ำส้มสายชูที่หนัง', 'Marinating & Seasoning', 'sparkles', false, false, false, false, '[{"key":"vinegarPct","labelTh":"ความเข้มข้นน้ำส้มสายชู (%)","labelEn":"Vinegar Pct","type":"number","required":false}]'::jsonb, 4, true),
    ('01925b34-0005-7000-8000-000000000005', 'DRY', 'ตากแดด / ผึ่งลม / พักในตู้เย็นให้หนังแห้ง', 'Drying / Chilling', 'wind', false, true, true, false, '[{"key":"dryingMethod","labelTh":"วิธีตาก (แดด/พัดลม/ตู้เย็น)","labelEn":"Method","type":"text","required":false}]'::jsonb, 5, true),
    ('01925b34-0006-7000-8000-000000000006', 'BAKE', 'อบไล่ความชื้น / อบพอง', 'Oven Baking', 'box', true, true, true, true, '[]'::jsonb, 6, true),
    ('01925b34-0007-7000-8000-000000000007', 'FRY', 'ทอดในน้ำมัน (รองรับทอดหลายรอบ)', 'Frying', 'soup', true, true, true, true, '[{"key":"oilType","labelTh":"ชนิดน้ำมัน","labelEn":"Oil Type","type":"lookup","lookupCategory":"OIL_TYPE","required":false}]'::jsonb, 7, true),
    ('01925b34-0008-7000-8000-000000000008', 'REST', 'พักหมูสะเด็ดน้ำมัน', 'Resting / Draining', 'clock', false, true, true, false, '[]'::jsonb, 8, true),
    ('01925b34-0009-7000-8000-000000000009', 'CUT', 'หั่นชิ้นและจัดเสิร์ฟ', 'Cutting & Plating', 'scissors', false, false, false, false, '[]'::jsonb, 9, true),
    ('01925b34-0010-7000-8000-000000000010', 'SIMMER', 'เคี่ยวซอส / ตั้งไฟเคี่ยว', 'Simmering / Boiling Sauce', 'flame', true, true, false, false, '[]'::jsonb, 10, true),
    ('01925b34-0011-7000-8000-000000000011', 'MIX', 'ผสมและคนให้ละลายเข้ากัน', 'Mixing & Stirring', 'utensils', false, true, false, false, '[]'::jsonb, 11, true),
    ('01925b34-0012-7000-8000-000000000012', 'BLEND_CHOP', 'โขลก / ปั่น / สับละเอียด', 'Pounding / Blending / Chopping', 'sparkles', false, true, false, false, '[]'::jsonb, 12, true)
ON CONFLICT (id) DO NOTHING;

-- 7. Common Ingredients
INSERT INTO ingredients (id, code, name_th, name_en, category_id, default_unit_id, notes, sort_order) VALUES
    ('01925b35-0001-7000-8000-000000000001', 'ING_PORK_BELLY', 'หมูสามชั้นสดคัดพิเศษ (หนังสวย ชั้นไขมันพอดี)', 'Fresh Pork Belly', '01925b33-0031-7000-8000-000000000001', '01925b31-0002-7000-8000-000000000002', 'เลือกสามชั้นลายสวย หนังเรียบไม่หนาเกินไป', 1),
    ('01925b35-0002-7000-8000-000000000002', 'ING_SALT', 'เกลือสมุทรบริสุทธิ์', 'Sea Salt', '01925b33-0032-7000-8000-000000000002', '01925b31-0001-7000-8000-000000000001', 'ใช้ทาหนังและหมักเนื้อ', 2),
    ('01925b35-0003-7000-8000-000000000003', 'ING_VINEGAR', 'น้ำส้มสายชูกลั่น 5%', 'Distilled White Vinegar 5%', '01925b33-0032-7000-8000-000000000002', '01925b31-0003-7000-8000-000000000003', 'ทาบนหนังหมูเพื่อให้หนังฟูกรอบกรอบนาน', 3),
    ('01925b35-0004-7000-8000-000000000004', 'ING_PALM_OIL', 'น้ำมันปาล์มสำหรับทอด', 'Palm Cooking Oil', '01925b33-0034-7000-8000-000000000004', '01925b31-0004-7000-8000-000000000004', 'ทนความร้อนสูง เหมาะสำหรับทอดหนังฟู', 4),
    ('01925b35-0005-7000-8000-000000000005', 'ING_PEPPER', 'พริกไทยขาวป่นแท้', 'Ground White Pepper', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'หมักเนื้อเพิ่มกลิ่นหอมตัดเลี่ยน', 5),
    ('01925b35-0006-7000-8000-000000000006', 'ING_FIVE_SPICE', 'ผงพะโล้แท้', 'Five Spice Powder', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'สูตรฮ่องกง เพิ่มความหอมลึก', 6),
    ('01925b35-0011-7000-8000-000000000011', 'ING_SWEET_SOY_SAUCE', 'ซีอิ๊วดำหวานแท้', 'Sweet Dark Soy Sauce', '01925b33-0032-7000-8000-000000000002', '01925b31-0001-7000-8000-000000000001', 'ซีอิ๊วดำหวานเนื้อข้น กลิ่นหอม สำหรับทำน้ำจิ้มซีอิ๊วดำ', 11),
    ('01925b35-0012-7000-8000-000000000012', 'ING_SUGAR', 'น้ำตาลทรายขาวบริสุทธิ์', 'Granulated Sugar', '01925b33-0032-7000-8000-000000000002', '01925b31-0001-7000-8000-000000000001', 'ละลายง่าย ให้ความหวานละมุน', 12),
    ('01925b35-0013-7000-8000-000000000013', 'ING_PALM_SUGAR', 'น้ำตาลมะพร้าว / น้ำตาลปี๊บแท้', 'Palm Sugar', '01925b33-0032-7000-8000-000000000002', '01925b31-0001-7000-8000-000000000001', 'ให้ความหวานนวลและกลิ่นหอมเฉพาะตัว', 13),
    ('01925b35-0014-7000-8000-000000000014', 'ING_FISH_SAUCE', 'น้ำปลาแท้เกรดพรีเมียม', 'Premium Fish Sauce', '01925b33-0032-7000-8000-000000000002', '01925b31-0003-7000-8000-000000000003', 'หมักธรรมชาติ รสเค็มกลมกล่อมไม่เค็มคาว', 14),
    ('01925b35-0015-7000-8000-000000000015', 'ING_LIME_JUICE', 'น้ำมะนาวคั้นสด 100%', 'Fresh Lime Juice', '01925b33-0032-7000-8000-000000000002', '01925b31-0003-7000-8000-000000000003', 'คั้นสดวันต่อวัน ไม่ขมเปลือก หอมเปรี้ยวสดชื่น', 15),
    ('01925b35-0016-7000-8000-000000000016', 'ING_TAMARIND_PASTE', 'น้ำมะขามเปียกเข้มข้น', 'Concentrated Tamarind Paste', '01925b33-0032-7000-8000-000000000002', '01925b31-0003-7000-8000-000000000003', 'คั้นเข้มข้น รสเปรี้ยวอมหวานสำหรับน้ำจิ้มแจ่ว', 16),
    ('01925b35-0017-7000-8000-000000000017', 'ING_BIRD_CHILI', 'พริกขี้หนูสวนสด', 'Fresh Bird Eye Chili', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'เผ็ดหอม ซอยหรือโขลกละเอียด', 17),
    ('01925b35-0018-7000-8000-000000000018', 'ING_RED_CHILI', 'พริกจินดาแดงสด', 'Fresh Red Jinda Chili', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'ซอยแว่นสำหรับดองน้ำส้มหรือซีอิ๊ว', 18),
    ('01925b35-0019-7000-8000-000000000019', 'ING_CHILI_FLAKES', 'พริกคั่วป่นละเอียด', 'Roasted Chili Flakes', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'คั่วใหม่หอมกรุ่น ไม่หืน', 19),
    ('01925b35-0020-7000-8000-000000000020', 'ING_TOASTED_RICE', 'ข้าวคั่วสมุนไพรหอม', 'Aromatic Toasted Rice Powder', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'คั่วพร้อมใบมะกรูดข่า ตะไคร้ บดหยาบ', 20),
    ('01925b35-0021-7000-8000-000000000021', 'ING_GARLIC', 'กระเทียมไทยสดแกะกลีบ', 'Fresh Thai Garlic', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'กลิ่นหอมฉุน รสเผ็ดร้อน สำหรับซอยและโขลก', 21),
    ('01925b35-0022-7000-8000-000000000022', 'ING_CORIANDER', 'รากและต้นผักชีไทยสด', 'Fresh Coriander and Roots', '01925b33-0033-7000-8000-000000000003', '01925b31-0001-7000-8000-000000000001', 'ใช้รากโขลก และซอยใบโรยแต่งกลิ่นหอม', 22)
ON CONFLICT (id) DO NOTHING;

-- 8. System Settings
INSERT INTO settings (key, value, value_type, description_th, description_en, is_public, version) VALUES
    ('shop.name', '"หมูกรอบ มี จำกัด"'::jsonb, 'string', 'ชื่อร้าน', 'Shop Name', true, 1),
    ('shop.currency', '"THB"'::jsonb, 'string', 'สกุลเงินที่ใช้', 'Currency', true, 1),
    ('shop.timezone', '"Asia/Bangkok"'::jsonb, 'string', 'เขตเวลา', 'Timezone', true, 1),
    ('trial.passScoreThreshold', '4.0'::jsonb, 'number', 'เกณฑ์คะแนนเฉลี่ยขั้นต่ำที่ถือว่าสูตรผ่าน (0-5)', 'Minimum score to consider trial passed', true, 1),
    ('trial.defaultTasterName', '""'::jsonb, 'string', 'ชื่อผู้ชิมเริ่มต้นในหน้าทดสอบ', 'Default taster name', false, 1)
ON CONFLICT (key) DO NOTHING;
