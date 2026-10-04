-- 000004_add_dipping_sauce_masterdata_and_recipes.up.sql
-- Add Dipping Sauce Master Data (tags, step types, ingredients) and standard dipping sauce recipes

-- 1. Recipe Tag: Dipping Sauce
INSERT INTO lookups (id, category, code, name_th, name_en, metadata, sort_order) VALUES
    ('01925b33-0046-7000-8000-000000000006', 'RECIPE_TAG', 'DIPPING_SAUCE', 'สูตรน้ำจิ้ม / ซอสเครื่องเคียง', 'Dipping Sauce / Condiments', '{}'::jsonb, 6)
ON CONFLICT (id) DO NOTHING;

-- 2. Process Step Types for Sauces
INSERT INTO process_step_types (id, code, name_th, name_en, icon, uses_temperature, uses_duration, uses_orientation, is_repeatable, param_schema, sort_order, is_active) VALUES
    ('01925b34-0010-7000-8000-000000000010', 'SIMMER', 'เคี่ยวซอส / ตั้งไฟเคี่ยว', 'Simmering / Boiling Sauce', 'flame', true, true, false, false, '[]'::jsonb, 10, true),
    ('01925b34-0011-7000-8000-000000000011', 'MIX', 'ผสมและคนให้ละลายเข้ากัน', 'Mixing & Stirring', 'utensils', false, true, false, false, '[]'::jsonb, 11, true),
    ('01925b34-0012-7000-8000-000000000012', 'BLEND_CHOP', 'โขลก / ปั่น / สับละเอียด', 'Pounding / Blending / Chopping', 'sparkles', false, true, false, false, '[]'::jsonb, 12, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Dipping Sauce Ingredients
INSERT INTO ingredients (id, code, name_th, name_en, category_id, default_unit_id, notes, sort_order) VALUES
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

-- 4. Recipes Insertion
DO $$
DECLARE
    v_admin_id UUID;
    v_unit_g UUID := '01925b31-0001-7000-8000-000000000001';
    v_unit_ml UUID := '01925b31-0003-7000-8000-000000000003';
    v_tag_sauce UUID := '01925b33-0046-7000-8000-000000000006';
    v_tag_sig UUID := '01925b33-0041-7000-8000-000000000001';
    v_tag_street UUID := '01925b33-0043-7000-8000-000000000003';
    
    v_step_prep UUID := '01925b34-0001-7000-8000-000000000001';
    v_step_rest UUID := '01925b34-0008-7000-8000-000000000008';
    v_step_simmer UUID := '01925b34-0010-7000-8000-000000000010';
    v_step_mix UUID := '01925b34-0011-7000-8000-000000000011';
    v_step_blend UUID := '01925b34-0012-7000-8000-000000000012';

    -- Recipe 1 IDs
    r1_id UUID := '01925b36-0002-7000-8000-000000000002';
    r1_ver_id UUID := '01925b37-0002-7000-8000-000000000002';
    
    -- Recipe 2 IDs
    r2_id UUID := '01925b36-0003-7000-8000-000000000003';
    r2_ver_id UUID := '01925b37-0003-7000-8000-000000000003';
    
    -- Recipe 3 IDs
    r3_id UUID := '01925b36-0004-7000-8000-000000000004';
    r3_ver_id UUID := '01925b37-0004-7000-8000-000000000004';
BEGIN
    SELECT id INTO v_admin_id FROM users WHERE email = 'admin@mookrob.local' LIMIT 1;
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM users LIMIT 1;
    END IF;

    -- =========================================================================
    -- Recipe 1: น้ำจิ้มซีอิ๊วดำหวานพริกดองสูตรโบราณ (RCP-0002)
    -- =========================================================================
    IF NOT EXISTS (SELECT 1 FROM recipes WHERE id = r1_id) THEN
        INSERT INTO recipes (id, code, name, description, status, current_version_id, created_by, version)
        VALUES (
            r1_id, 'RCP-0002',
            'น้ำจิ้มซีอิ๊วดำหวานพริกดองสูตรโบราณ',
            'น้ำจิ้มซีอิ๊วดำรสเข้มข้น หวานนำ เปรี้ยวตาม เค็มปลาย ซอยพริกจินดาและกระเทียมสด เข้ากันได้ดีที่สุดกับหมูกรอบหนังกรอบฟู',
            'APPROVED', r1_ver_id, v_admin_id, 1
        );

        INSERT INTO recipe_versions (id, recipe_id, version_no, change_note, input_quantity, input_unit_id, expected_output_quantity, expected_output_unit_id, expected_yield_pct, notes, created_by)
        VALUES (
            r1_ver_id, r1_id, 1,
            'สูตรมาตรฐานประจำร้าน เคี่ยวน้ำเชื่อมซีอิ๊วดำให้ละลายเนียนแล้วดองพริกกระเทียมสด',
            500.0, v_unit_g, 480.0, v_unit_g, 96.00,
            'เก็บในภาชนะปิดมิดชิดในตู้เย็นได้นาน 1 เดือน ยิ่งดองข้ามคืนยิ่งเข้าเนื้อ',
            v_admin_id
        );

        INSERT INTO recipe_tags (recipe_id, tag_id) VALUES 
            (r1_id, v_tag_sauce),
            (r1_id, v_tag_sig);

        -- Ingredients Recipe 1
        INSERT INTO recipe_ingredients (id, version_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional) VALUES
            (gen_random_uuid(), r1_ver_id, 1, '01925b35-0011-7000-8000-000000000011', 150.0, v_unit_g, 'ซีอิ๊วดำหวานคุณภาพดีเนื้อข้น', false),
            (gen_random_uuid(), r1_ver_id, 2, '01925b35-0003-7000-8000-000000000003', 100.0, v_unit_ml, 'น้ำส้มสายชูกลั่น 5% แท้', false),
            (gen_random_uuid(), r1_ver_id, 3, '01925b35-0012-7000-8000-000000000012', 120.0, v_unit_g, 'น้ำตาลทรายขาวบริสุทธิ์', false),
            (gen_random_uuid(), r1_ver_id, 4, '01925b35-0002-7000-8000-000000000002', 5.0, v_unit_g, 'เกลือสมุทรตัดรส', false),
            (gen_random_uuid(), r1_ver_id, 5, '01925b35-0018-7000-8000-000000000018', 60.0, v_unit_g, 'พริกจินดาแดงสด ซอยแว่นบาง', false),
            (gen_random_uuid(), r1_ver_id, 6, '01925b35-0021-7000-8000-000000000021', 45.0, v_unit_g, 'กระเทียมไทยสด สับหยาบ', false);

        -- Steps Recipe 1
        INSERT INTO process_steps (id, version_id, step_no, round_no, step_type_id, title, instruction, temperature_c, duration_minutes, orientation_id, params, notes) VALUES
            (gen_random_uuid(), r1_ver_id, 1, NULL, v_step_prep, 'เตรียมและซอยพริกกระเทียม', 'ล้างพริกจินดาแดงและกระเทียมไทยให้สะอาด ซับให้แห้ง ซอยพริกเป็นแว่นบาง สับกระเทียมหยาบ พักไว้', NULL, 10.0, NULL, '{}'::jsonb, 'ระวังอย่าให้มีน้ำตกค้างจะทำให้น้ำจิ้มเสียเร็ว'),
            (gen_random_uuid(), r1_ver_id, 2, NULL, v_step_simmer, 'เคี่ยวน้ำเชื่อมซีอิ๊วดำ', 'ผสมซีอิ๊วดำหวาน น้ำส้มสายชู น้ำตาลทราย และเกลือลงในหม้อ ตั้งไฟอ่อน เคี่ยวจนน้ำตาลและเกลือละลายหมด', 85.0, 5.0, NULL, '{}'::jsonb, 'ใช้ไฟอ่อน ระวังไหม้ก้นหม้อ'),
            (gen_random_uuid(), r1_ver_id, 3, NULL, v_step_rest, 'พักน้ำเชื่อมให้เย็นสนิท', 'ยกลงจากเตา วางพักไว้ที่อุณหภูมิห้องจนน้ำเชื่อมเย็นสนิท (ห้ามใส่พริกกระเทียมตอนร้อนจะทำให้พริกสลดและดำ)', NULL, 20.0, NULL, '{}'::jsonb, 'ต้องรอให้เย็นสนิทก่อนผสม'),
            (gen_random_uuid(), r1_ver_id, 4, NULL, v_step_mix, 'ผสมพริกกระเทียมและดองรส', 'ใส่พริกจินดาซอยและกระเทียมสับลงในน้ำเชื่อมซีอิ๊วดำ คนให้เข้ากัน ชิมรสหวานนำ เปรี้ยวตาม เผ็ดหอมสดชื่น', NULL, 5.0, NULL, '{}'::jsonb, 'บรรจุขวดแก้วสะอาด');
    END IF;

    -- =========================================================================
    -- Recipe 2: น้ำจิ้มซีฟู้ดมะนาวสดตัดเลี่ยน (RCP-0003)
    -- =========================================================================
    IF NOT EXISTS (SELECT 1 FROM recipes WHERE id = r2_id) THEN
        INSERT INTO recipes (id, code, name, description, status, current_version_id, created_by, version)
        VALUES (
            r2_id, 'RCP-0003',
            'น้ำจิ้มซีฟู้ดมะนาวสดตัดเลี่ยน',
            'น้ำจิ้มซีฟู้ดพริกสดมะนาวแท้ รสชาติจัดจ้าน เปรี้ยวจี๊ด เผ็ดแซ่บ กลิ่นหอมพริกสวนและกระเทียม สำหรับทานคู่หมูกรอบช่วยตัดเลี่ยนยอดเยี่ยม',
            'APPROVED', r2_ver_id, v_admin_id, 1
        );

        INSERT INTO recipe_versions (id, recipe_id, version_no, change_note, input_quantity, input_unit_id, expected_output_quantity, expected_output_unit_id, expected_yield_pct, notes, created_by)
        VALUES (
            r2_ver_id, r2_id, 1,
            'สูตรมะนาวคั้นสดแท้ 100% ไม่ใช้ผงมะนาว โขลกรากผักชีพริกกระเทียมสด',
            350.0, v_unit_g, 330.0, v_unit_g, 94.28,
            'ทำสดวันต่อวันเพื่อรักษาสีเขียวสดใสและกลิ่นหอมของมะนาว',
            v_admin_id
        );

        INSERT INTO recipe_tags (recipe_id, tag_id) VALUES 
            (r2_id, v_tag_sauce),
            (r2_id, v_tag_sig);

        -- Ingredients Recipe 2
        INSERT INTO recipe_ingredients (id, version_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional) VALUES
            (gen_random_uuid(), r2_ver_id, 1, '01925b35-0017-7000-8000-000000000017', 60.0, v_unit_g, 'พริกขี้หนูสวนสดคัดเขียวแดง', false),
            (gen_random_uuid(), r2_ver_id, 2, '01925b35-0021-7000-8000-000000000021', 60.0, v_unit_g, 'กระเทียมไทยแกะกลีบ', false),
            (gen_random_uuid(), r2_ver_id, 3, '01925b35-0022-7000-8000-000000000022', 20.0, v_unit_g, 'รากผักชีไทยสด ล้างสะอาดหั่นท่อน', false),
            (gen_random_uuid(), r2_ver_id, 4, '01925b35-0015-7000-8000-000000000015', 100.0, v_unit_ml, 'น้ำมะนาวคั้นสดแท้ 100%', false),
            (gen_random_uuid(), r2_ver_id, 5, '01925b35-0014-7000-8000-000000000014', 90.0, v_unit_ml, 'น้ำปลาแท้เกรดพรีเมียม', false),
            (gen_random_uuid(), r2_ver_id, 6, '01925b35-0012-7000-8000-000000000012', 50.0, v_unit_g, 'น้ำตาลทรายขาวบริสุทธิ์', false),
            (gen_random_uuid(), r2_ver_id, 7, '01925b35-0002-7000-8000-000000000002', 3.0, v_unit_g, 'เกลือสมุทร รักษาความสดของสีพริก', false);

        -- Steps Recipe 2
        INSERT INTO process_steps (id, version_id, step_no, round_no, step_type_id, title, instruction, temperature_c, duration_minutes, orientation_id, params, notes) VALUES
            (gen_random_uuid(), r2_ver_id, 1, NULL, v_step_prep, 'เตรียมและคั้นมะนาวสด', 'ล้างพริกขี้หนูสวน กระเทียม และรากผักชี คั้นมะนาวสดโดยไม่บีบเค้นเปลือกเพื่อไม่ให้มีรสขม กรองเมล็ดออก', NULL, 10.0, NULL, '{}'::jsonb, 'มะนาวสดควรคั้นทันทีก่อนผสม'),
            (gen_random_uuid(), r2_ver_id, 2, NULL, v_step_blend, 'โขลกเครื่องเทศพริกกระเทียม', 'นำรากผักชี กระเทียมไทย พริกขี้หนูสวน และเกลือ โขลกในครกหินหรือปั่นหยาบพอแหลก', NULL, 8.0, NULL, '{}'::jsonb, 'โขลกหยาบให้เคี้ยวโดนเนื้อพริกกระเทียม'),
            (gen_random_uuid(), r2_ver_id, 3, NULL, v_step_mix, 'ปรุงรสและละลายน้ำตาล', 'ใส่น้ำมะนาวคั้นสด น้ำปลาแท้ และน้ำตาลทราย คนให้เข้ากันจนน้ำตาลละลายเข้ากับเนื้อพริกกระเทียม', NULL, 5.0, NULL, '{}'::jsonb, 'ชิมรสเปรี้ยวจี๊ดนำ เค็มตาม เผ็ดแซ่บ'),
            (gen_random_uuid(), r2_ver_id, 4, NULL, v_step_rest, 'พักรสชาติก่อนเสิร์ฟ', 'พักน้ำจิ้มไว้ประมาณ 10 นาทีเพื่อให้รสชาติซึมเข้าเนื้อพริกกระเทียม พร้อมเสิร์ฟคู่หมูกรอบ', NULL, 10.0, NULL, '{}'::jsonb, 'เสิร์ฟแบบเย็นหรืออุณหภูมิห้อง');
    END IF;

    -- =========================================================================
    -- Recipe 3: น้ำจิ้มแจ่วข้าวคั่วพริกป่นมะขามเปียก (RCP-0004)
    -- =========================================================================
    IF NOT EXISTS (SELECT 1 FROM recipes WHERE id = r3_id) THEN
        INSERT INTO recipes (id, code, name, description, status, current_version_id, created_by, version)
        VALUES (
            r3_id, 'RCP-0004',
            'น้ำจิ้มแจ่วข้าวคั่วพริกป่นมะขามเปียก',
            'น้ำจิ้มแจ่วสไตล์อีสานแท้ เปรี้ยวอมหวานจากน้ำมะขามเปียก เค็มกลมกล่อม หอมกลิ่นข้าวคั่วสมุนไพรคั่วใหม่และพริกป่น เข้ากับหมูกรอบย่าง/ทอดได้อย่างลงตัว',
            'APPROVED', r3_ver_id, v_admin_id, 1
        );

        INSERT INTO recipe_versions (id, recipe_id, version_no, change_note, input_quantity, input_unit_id, expected_output_quantity, expected_output_unit_id, expected_yield_pct, notes, created_by)
        VALUES (
            r3_ver_id, r3_id, 1,
            'สูตรเคี่ยวน้ำมะขามเปียกกับน้ำตาลปี๊บเพิ่มความนัว ข้าวคั่วใหม่ส่งกลิ่นหอมกรุ่น',
            300.0, v_unit_g, 290.0, v_unit_g, 96.67,
            'ข้าวคั่วควรใส่ก่อนเสิร์ฟไม่นานเพื่อให้คงความกรุบกรอบ',
            v_admin_id
        );

        INSERT INTO recipe_tags (recipe_id, tag_id) VALUES 
            (r3_id, v_tag_sauce),
            (r3_id, v_tag_street);

        -- Ingredients Recipe 3
        INSERT INTO recipe_ingredients (id, version_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional) VALUES
            (gen_random_uuid(), r3_ver_id, 1, '01925b35-0016-7000-8000-000000000016', 100.0, v_unit_ml, 'น้ำมะขามเปียกเข้มข้นกรองสะอาด', false),
            (gen_random_uuid(), r3_ver_id, 2, '01925b35-0014-7000-8000-000000000014', 80.0, v_unit_ml, 'น้ำปลาแท้เกรดพรีเมียม', false),
            (gen_random_uuid(), r3_ver_id, 3, '01925b35-0013-7000-8000-000000000013', 60.0, v_unit_g, 'น้ำตาลมะพร้าว / น้ำตาลปี๊บแท้', false),
            (gen_random_uuid(), r3_ver_id, 4, '01925b35-0019-7000-8000-000000000019', 25.0, v_unit_g, 'พริกคั่วป่นละเอียดคั่วใหม่', false),
            (gen_random_uuid(), r3_ver_id, 5, '01925b35-0020-7000-8000-000000000020', 30.0, v_unit_g, 'ข้าวคั่วสมุนไพรหอม', false),
            (gen_random_uuid(), r3_ver_id, 6, '01925b35-0022-7000-8000-000000000022', 15.0, v_unit_g, 'ต้นและใบผักชีไทยซอยละเอียด', false);

        -- Steps Recipe 3
        INSERT INTO process_steps (id, version_id, step_no, round_no, step_type_id, title, instruction, temperature_c, duration_minutes, orientation_id, params, notes) VALUES
            (gen_random_uuid(), r3_ver_id, 1, NULL, v_step_simmer, 'เคี่ยวซอสมะขามเปียก', 'ผสมน้ำมะขามเปียก น้ำปลาแท้ และน้ำตาลมะพร้าวลงในหม้อ ตั้งไฟอ่อน เคี่ยวจนน้ำตาลปี๊บละลายเนียนเข้ากัน', 75.0, 4.0, NULL, '{}'::jsonb, 'เคี่ยวพอเดือดยิบๆ อย่าให้ไหม้'),
            (gen_random_uuid(), r3_ver_id, 2, NULL, v_step_rest, 'พักน้ำจิ้มให้อุ่น', 'ยกลงจากเตา พักไว้ให้อุ่นคลายร้อน (ประมาณ 10 นาที)', NULL, 10.0, NULL, '{}'::jsonb, 'พักให้อุ่นก่อนใส่พริกและข้าวคั่ว'),
            (gen_random_uuid(), r3_ver_id, 3, NULL, v_step_mix, 'ใส่พริกป่นและข้าวคั่ว', 'ใส่พริกป่นคั่วใหม่และข้าวคั่วสมุนไพร คนให้เข้ากัน ข้าวคั่วจะค่อยๆ ดูดน้ำและส่งกลิ่นหอมฟุ้ง', NULL, 3.0, NULL, '{}'::jsonb, 'ข้าวคั่วคั่วใหม่จะหอมกรุ่นเป็นพิเศษ'),
            (gen_random_uuid(), r3_ver_id, 4, NULL, v_step_prep, 'โรยผักชีซอยจัดเสิร์ฟ', 'โรยผักชีซอยและต้นหอม ชิมรสเปรี้ยวอมหวาน เค็มตาม เผ็ดหอมกลิ่นข้าวคั่ว พร้อมเสิร์ฟคู่หมูกรอบ', NULL, 2.0, NULL, '{}'::jsonb, 'จัดเสิร์ฟในถ้วยน้ำจิ้ม');
    END IF;

    -- Update recipe counter
    INSERT INTO counters (name, current_val)
    VALUES ('recipe_code', 4)
    ON CONFLICT (name) DO UPDATE
    SET current_val = GREATEST(counters.current_val, 4);

END $$;
