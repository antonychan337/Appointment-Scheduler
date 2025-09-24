-- =====================================================
-- Supabase Schema Migration Script
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. SHOPS TABLE - Add missing columns
-- =====================================================
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS store_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "20:00", "closed": false},
    "saturday": {"open": "10:00", "close": "17:00", "closed": false},
    "sunday": {"open": "", "close": "", "closed": true}
}'::JSONB;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER DEFAULT 2;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS max_booking_days INTEGER DEFAULT 30;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS cancellation_notice_hours INTEGER DEFAULT 24;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS display_info JSONB DEFAULT '{
    "showPhone": true,
    "showEmail": true,
    "showAddress": true,
    "showWechat": false
}'::JSONB;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS owner_first_name TEXT;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS owner_last_name TEXT;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS wechat_id TEXT;

-- 2. BARBERS TABLE - Ensure all columns exist
-- =====================================================
-- Check if barbers table exists first
CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT,
    is_owner BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    profile_id UUID,
    uses_store_hours BOOLEAN DEFAULT false,
    service_ids JSONB DEFAULT '[]'::JSONB,
    working_hours JSONB,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing barbers table
ALTER TABLE barbers
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE barbers
ADD COLUMN IF NOT EXISTS uses_store_hours BOOLEAN DEFAULT false;

ALTER TABLE barbers
ADD COLUMN IF NOT EXISTS working_hours JSONB;

ALTER TABLE barbers
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 3. SERVICES TABLE - Ensure all columns exist
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    name_zh TEXT,
    duration INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    has_active_time BOOLEAN DEFAULT false,
    active_periods JSONB,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS name_en TEXT;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS name_zh TEXT;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS has_active_time BOOLEAN DEFAULT false;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS active_periods JSONB;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 4. APPOINTMENTS TABLE - Ensure all columns exist
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_notes TEXT,
    service_ids JSONB NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT DEFAULT 'confirmed',
    total_price NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ
);

-- Add any missing columns to existing appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2);

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 5. BLOCKED_TIMES TABLE - Ensure all columns exist
-- =====================================================
CREATE TABLE IF NOT EXISTS blocked_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT,
    block_type TEXT DEFAULT 'other',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing blocked_times table
ALTER TABLE blocked_times
ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'other';

-- 6. CREATE INDEXES for better performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shops_email ON shops(email);
CREATE INDEX IF NOT EXISTS idx_barbers_shop_id ON barbers(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_shop_id ON blocked_times(shop_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_barber ON blocked_times(barber_id);

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- 8. CREATE RLS POLICIES (basic - adjust as needed)
-- =====================================================
-- Allow users to see their own shop data
CREATE POLICY "Users can view own shop" ON shops
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update own shop" ON shops
    FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Allow shop owners to manage their barbers
CREATE POLICY "Shop owners can view barbers" ON barbers
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Shop owners can manage barbers" ON barbers
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Similar policies for other tables
CREATE POLICY "Shop owners can view services" ON services
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Shop owners can manage services" ON services
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Shop owners can view appointments" ON appointments
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Shop owners can manage appointments" ON appointments
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Shop owners can view blocked_times" ON blocked_times
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Shop owners can manage blocked_times" ON blocked_times
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE email = auth.jwt() ->> 'email'
        )
    );

-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON shops TO authenticated;
GRANT ALL ON barbers TO authenticated;
GRANT ALL ON services TO authenticated;
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON blocked_times TO authenticated;

-- 10. VERIFICATION QUERY - Run this to check if migration worked
-- =====================================================
-- SELECT
--     'shops' as table_name,
--     COUNT(*) as column_count,
--     array_agg(column_name) as columns
-- FROM information_schema.columns
-- WHERE table_name = 'shops'
-- UNION ALL
-- SELECT
--     'barbers' as table_name,
--     COUNT(*) as column_count,
--     array_agg(column_name) as columns
-- FROM information_schema.columns
-- WHERE table_name = 'barbers'
-- UNION ALL
-- SELECT
--     'services' as table_name,
--     COUNT(*) as column_count,
--     array_agg(column_name) as columns
-- FROM information_schema.columns
-- WHERE table_name = 'services'
-- UNION ALL
-- SELECT
--     'appointments' as table_name,
--     COUNT(*) as column_count,
--     array_agg(column_name) as columns
-- FROM information_schema.columns
-- WHERE table_name = 'appointments'
-- UNION ALL
-- SELECT
--     'blocked_times' as table_name,
--     COUNT(*) as column_count,
--     array_agg(column_name) as columns
-- FROM information_schema.columns
-- WHERE table_name = 'blocked_times';