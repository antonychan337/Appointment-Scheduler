-- Complete Migration Script for Appointment Scheduler
-- Run this in your Supabase SQL Editor to fix all missing columns

-- 1. Add store_hours column to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS store_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "10:00", "close": "17:00", "closed": false},
    "sunday": {"open": "10:00", "close": "17:00", "closed": true}
}'::JSONB;

-- 2. Add booking settings columns to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_booking_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS cancellation_notice_hours INTEGER DEFAULT 24;

-- 3. Add display_info column to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS display_info JSONB DEFAULT '{"showPhone": true, "showEmail": true, "showAddress": true, "showWechat": false}'::JSONB;

-- 4. Add owner information columns to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS owner_first_name TEXT,
ADD COLUMN IF NOT EXISTS owner_last_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS wechat_id TEXT;

-- 5. Add missing columns to barbers table if needed
ALTER TABLE barbers
ADD COLUMN IF NOT EXISTS profile_id UUID,
ADD COLUMN IF NOT EXISTS uses_store_hours BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS working_hours JSONB,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS title TEXT;

-- 6. Add missing columns to services table if needed
ALTER TABLE services
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS category TEXT;

-- 7. Verify all tables have proper indexes
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_email ON shops(email);
CREATE INDEX IF NOT EXISTS idx_barbers_shop_id ON barbers(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_shop_id ON blocked_times(shop_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_barber_id ON blocked_times(barber_id);

-- 8. Grant permissions (if not already done)
GRANT ALL ON shops TO authenticated;
GRANT ALL ON barbers TO authenticated;
GRANT ALL ON services TO authenticated;
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON blocked_times TO authenticated;

-- Success! All columns and indexes added.
-- Your appointment scheduler should now work properly.