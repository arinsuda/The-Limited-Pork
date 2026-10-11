-- Restore all soft-deleted recipes
UPDATE recipes SET deleted_at = NULL WHERE deleted_at IS NOT NULL;

-- Create RCP-0001 (Flagship Crispy Pork Recipe) if not exists
DO $$
DECLARE
    v_admin_id UUID := '01a124e4-a3cf-73fc-95d5-4fa304f7965f';
    v_recipe_id UUID := '01925b36-0001-7000-8000-000000000001';
    v_ver_id UUID := '01925b37-0001-7000-8000-000000000001';
    v_unit_g UUID := '01925b31-0001-7000-8000-000000000001';
    v_unit_kg UUID := '01925b31-0002-7000-8000-000000000002';
    v_unit_ml UUID := '01925b31-0003-7000-8000-000000000003';
    v_unit_l UUID := '01925b31-0004-7000-8000-000000000004';
    v_tag_sig UUID := '01925b33-0041-7000-8000-000000000001';
    v_tag_hk UUID := '01925b33-0042-7000-8000-000000000002';
    
    v_step_prep UUID := '01925b34-0001-7000-8000-000000000001';
    v_step_boil UUID := '01925b34-0002-7000-8000-000000000002';
    v_step_score UUID := '01925b34-0003-7000-8000-000000000003';
    v_step_marinate UUID := '01925b34-0004-7000-8000-000000000004';
    v_step_dry UUID := '01925b34-0005-7000-8000-000000000005';
    v_step_bake UUID := '01925b34-0006-7000-8000-000000000006';
    v_step_fry UUID := '01925b34-0007-7000-8000-000000000007';
    v_step_rest UUID := '01925b34-0008-7000-8000-000000000008';
    v_step_cut UUID := '01925b34-0009-7000-8000-000000000009';
    
    v_orient_up UUID := '01925b33-0001-7000-8000-000000000001';
    v_orient_down UUID := '01925b33-0002-7000-8000-000000000002';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM recipes WHERE code = 'RCP-0001') THEN
        INSERT INTO recipes (id, code, name, description, status, current_version_id, created_by, version)
        VALUES (
            v_recipe_id, 'RCP-0001',
            'หมูกรอบ มี จำกัด — สูตรซิกเนเจอร์หนังพองฟูกรอบนาน',
            'สูตรหมูกรอบมาตรฐานทองคำระดับ Enterprise หนังกรอบฟูสนั่นสะเทือนใจ เนื้อหมูสามชั้นนุ่มฉ่ำไม่แห้งกระด้าง รสชาติเค็มนัวกลมกล่อม หอมเครื่องเทศพะโล้และพริกไทยขาว ผ่านเทคนิคต้ม จิ้มหนัง บั้งเนื้อ อบไล่ชื้น และทอด 2 อุณหภูมิเพื่อล็อกความกรอบนานกว่า 4 ชั่วโมง',
            'APPROVED', v_ver_id, v_admin_id, 1
        );

        INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
            (v_recipe_id, v_tag_sig),
            (v_recipe_id, v_tag_hk);

        INSERT INTO recipe_versions (id, recipe_id, version_no, change_note, input_quantity, input_unit_id, expected_output_quantity, expected_output_unit_id, expected_yield_pct, notes, created_by)
        VALUES (
            v_ver_id, v_recipe_id, 1,
            'เวอร์ชันเริ่มต้น (Golden Standard Baseline V1.0)',
            2.0000, v_unit_kg, 1.2500, v_unit_kg, 62.50,
            'คำนวณจากหมูสามชั้นสด 2 kg น้ำหนักหลังทอดเฉลี่ย 1.25 kg Yield 62.5%',
            v_admin_id
        );

        -- Ingredients
        INSERT INTO recipe_ingredients (id, version_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional) VALUES
            (gen_random_uuid(), v_ver_id, 1, '01925b35-0001-7000-8000-000000000001', 2.0, v_unit_kg, 'หมูสามชั้นสดคัดพิเศษ แผ่นสี่เหลี่ยมสวย ชั้นเนื้อสลับมัน 5 ชั้นพอดี หนังเรียบสม่ำเสมอ', false),
            (gen_random_uuid(), v_ver_id, 2, '01925b35-0002-7000-8000-000000000002', 40.0, v_unit_g, 'เกลือสมุทรบริสุทธิ์ (แบ่งทาหนัง 20g หมักเนื้อ 20g)', false),
            (gen_random_uuid(), v_ver_id, 3, '01925b35-0003-7000-8000-000000000003', 60.0, v_unit_ml, 'น้ำส้มสายชูกลั่น 5% สำหรับทาหนังเปิดรูขุมขนช่วยฟูกรอบ', false),
            (gen_random_uuid(), v_ver_id, 4, '01925b35-0005-7000-8000-000000000005', 15.0, v_unit_g, 'พริกไทยขาวป่นแท้ หมักฝั่งเนื้อเพิ่มความหอมตัดเลี่ยน', false),
            (gen_random_uuid(), v_ver_id, 5, '01925b35-0006-7000-8000-000000000006', 10.0, v_unit_g, 'ผงพะโล้แท้ กลิ่นหอมลึกสไตล์ภัตตาคารฮ่องกง', false),
            (gen_random_uuid(), v_ver_id, 6, '01925b35-0004-7000-8000-000000000004', 3.0, v_unit_l, 'น้ำมันปาล์มสำหรับทอด ทนความร้อนสูง ทอดระดับ Deep Fry', false);

        -- Process Steps
        INSERT INTO process_steps (id, version_id, step_no, round_no, step_type_id, title, instruction, temperature_c, duration_minutes, orientation_id, params, notes) VALUES
            (gen_random_uuid(), v_ver_id, 1, NULL, v_step_prep, 'เตรียมและทำความสะอาด', 'ขูดขนหมูบนหนังให้เกลี้ยง ล้างด้วยน้ำเกลือ เช็ดให้แห้งสนิท ตัดแต่งขอบให้เป็นทรงสี่เหลี่ยมผืนผ้าเท่ากัน', NULL, 15.0, NULL, '{}'::jsonb, 'เช็ดหนังให้แห้งสนิท'),
            (gen_random_uuid(), v_ver_id, 2, NULL, v_step_boil, 'ต้มหมูสามชั้น', 'ตั้งหม้อน้ำเดือด ใส่เกลือเล็กน้อย นำหมูลงต้มโดยเอาหนังคว่ำลง ต้มจนหนังหมูสุกใส มีความหยุ่นนุ่ม', 98.0, 25.0, v_orient_down, '{"saltAddedGrams":15}'::jsonb, 'ต้มเฉพาะหนังให้สุกใส อย่าต้มจนเละ'),
            (gen_random_uuid(), v_ver_id, 3, NULL, v_step_score, 'จิ้มหนังและบั้งเนื้อ', 'ใช้เหล็กแหลมหรือส้อมจิ้มหนังหมูให้ทั่วอย่างสม่ำเสมอตลอดทั้งแผ่น (จิ้มลึกถึงชั้นไขมัน อย่าให้โดนเนื้อ) จากนั้นบั้งฝั่งเนื้อเป็นแนวยาวลึก 1.5 ซม. ห่างกันช่วงละ 1 นิ้ว', NULL, 15.0, NULL, '{"needleDensity":"ถี่มากสม่ำเสมอ"}'::jsonb, 'ยิ่งจิ้มถี่สม่ำเสมอ หนังยิ่งฟูกรอบทั่วแผ่น'),
            (gen_random_uuid(), v_ver_id, 4, NULL, v_step_marinate, 'หมักเนื้อและทาเกลือ/น้ำส้มที่หนัง', 'ทาน้ำส้มสายชูและเกลือสมุทรให้ทั่วผิวหนังหมู ส่วนฝั่งเนื้อทาด้วยเกลือ พริกไทยขาว และผงพะโล้ให้ทั่วร่องที่บั้งไว้ (ระวังอย่าให้เครื่องเทศโดนหนังหมู)', NULL, 20.0, NULL, '{"vinegarPct":5}'::jsonb, 'เครื่องเทศหมักเฉพาะฝั่งเนื้อเท่านั้น'),
            (gen_random_uuid(), v_ver_id, 5, NULL, v_step_dry, 'ผึ่งลมไล่ความชื้น', 'วางหมูบนตะแกรงโดยเอาหนังหงายขึ้น ผึ่งพัดลมหรือแช่ตู้เย็นแบบไม่ปิดฝาจนหนังหมูแห้งตึงแข็งเหมือนพลาสติก', 4.0, 120.0, v_orient_up, '{"dryingMethod":"ตู้เย็นเปิดฝา/พัดลม"}'::jsonb, 'หนังต้องแห้งสนิทก่อนนำไปอบ'),
            (gen_random_uuid(), v_ver_id, 6, NULL, v_step_bake, 'อบไล่ความชื้นชั้นไขมัน', 'นำเข้าเตาอบไฟบน-ล่าง วางตะแกรงกลาง เอาหนังหงายขึ้น อบเพื่อไล่น้ำมันใต้หนังและทำให้หนังแห้งกรอบสม่ำเสมอ', 180.0, 35.0, v_orient_up, '{}'::jsonb, 'สังเกตหนังเริ่มมีตุ่มพองเล็กๆ'),
            (gen_random_uuid(), v_ver_id, 7, 1, v_step_fry, 'ทอดรอบแรกไฟกลาง (ดันหนังพอง)', 'ตั้งกระทะน้ำมันปาล์มไฟกลาง นำหมูลงทอดโดยคว่ำหนังลงในน้ำมัน ทอดจนหนังหมูเริ่มพองฟูทั่วทั้งแผ่น', 160.0, 15.0, v_orient_down, '{"oilType":"PALM"}'::jsonb, 'ทอดไฟกลาง หนังคว่ำลงจุ่มน้ำมัน'),
            (gen_random_uuid(), v_ver_id, 8, NULL, v_step_rest, 'พักสะเด็ดน้ำมันคลายร้อน', 'ตักขึ้นพักบนตะแกรง พักให้คลายความร้อน 10-15 นาที เพื่อให้โครงสร้างหนังเซ็ตตัวกรอบแน่น', NULL, 15.0, v_orient_up, '{}'::jsonb, 'การพักช่วยให้ทอดรอบ 2 กรอบฟูทวีคูณ'),
            (gen_random_uuid(), v_ver_id, 9, 2, v_step_fry, 'ทอดรอบสองไฟแรง (ระเบิดหนังฟูกรอบนาน)', 'เร่งน้ำมันไฟแรง ตักน้ำมันร้อนๆ ราดบนหนังหมู หรือคว่ำหนังลงทอดสั้นๆ จนหนังหมูระเบิดฟูสะบัดเป็นเม็ดทรายสีทองอร่าม', 190.0, 5.0, v_orient_down, '{"oilType":"PALM"}'::jsonb, 'ทอดสั้นๆ ไฟแรง หนังจะกรอบสนั่นไม่เหนียว'),
            (gen_random_uuid(), v_ver_id, 10, NULL, v_step_cut, 'พักสะเด็ดน้ำมัน หั่นชิ้น และจัดเสิร์ฟ', 'พักบนตะแกรงให้สะเด็ดน้ำมัน หั่นตามร่องที่บั้งไว้ จัดเสิร์ฟคู่กับน้ำจิ้มซีอิ๊วดำหวาน น้ำจิ้มซีฟู้ด หรือน้ำจิ้มแจ่ว', NULL, 5.0, NULL, '{}'::jsonb, 'กรอบสะท้านฟัน เนื้อฉ่ำนุ่มละมุน');
    END IF;
END $$;
