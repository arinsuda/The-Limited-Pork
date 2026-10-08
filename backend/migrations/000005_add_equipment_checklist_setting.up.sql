-- 000005_add_equipment_checklist_setting.up.sql
-- Add equipment checklist and procurement planning setting

INSERT INTO settings (key, value, value_type, description_th, description_en, is_public, version) VALUES
(
    'equipment.checklist',
    '[]'::jsonb,
    'object',
    'รายการอุปกรณ์และสเปกการจัดซื้อสำหรับควบคุมคุณภาพหมูกรอบ',
    'Equipment and procurement checklist for crispy pork QC',
    true,
    1
)
ON CONFLICT (key) DO NOTHING;
