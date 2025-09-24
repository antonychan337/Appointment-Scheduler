-- =====================================================
-- Add Translation Support to Services Table
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add the missing translation columns
ALTER TABLE services
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_zh TEXT;

-- Delete the test "New Service" entry if it exists
DELETE FROM services WHERE name = '新服务' OR name = 'New Service';

-- Insert Children's Cut if it doesn't exist (since setup-wizard expects 5 default services)
-- This uses a unique constraint workaround to insert only if not exists
INSERT INTO services (id, shop_id, name, name_en, name_zh, duration, price, enabled, color, display_order)
SELECT
    gen_random_uuid(),
    shop_id,
    '儿童理发',
    'Children''s Cut',
    '儿童理发',
    15,
    15.00,
    true,
    '#4CAF50',
    3
FROM services
WHERE shop_id = (SELECT DISTINCT shop_id FROM services LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM services
    WHERE name IN ('儿童理发', 'Children''s Cut', 'Kids Cut')
    AND shop_id = (SELECT DISTINCT shop_id FROM services LIMIT 1)
)
LIMIT 1;

-- Update existing services with default translations
-- This preserves your existing data while adding translation support
UPDATE services
SET
    name_en = COALESCE(name_en,
        CASE
            WHEN name = '男士理发' THEN 'Men''s Cut'
            WHEN name = '女士理发' THEN 'Women''s Cut'
            WHEN name = '儿童理发' THEN 'Children''s Cut'
            WHEN name = '染发' THEN 'Hair Coloring'
            WHEN name = '挑染' THEN 'Highlights'
            ELSE name
        END
    ),
    name_zh = COALESCE(name_zh,
        CASE
            WHEN name IN ('Men''s Cut', 'Mens Cut') THEN '男士理发'
            WHEN name IN ('Women''s Cut', 'Womens Cut') THEN '女士理发'
            WHEN name IN ('Children''s Cut', 'Kids Cut') THEN '儿童理发'
            WHEN name = 'Hair Coloring' THEN '染发'
            WHEN name = 'Highlights' THEN '挑染'
            ELSE name
        END
    )
WHERE name_en IS NULL OR name_zh IS NULL;

-- Verify the migration worked
SELECT
    id,
    name,
    name_en,
    name_zh,
    duration,
    price
FROM services
ORDER BY display_order;

-- Check column exists query
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'services'
-- AND column_name IN ('name_en', 'name_zh');