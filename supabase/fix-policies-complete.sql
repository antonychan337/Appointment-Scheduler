-- Complete fix for RLS policies - removing all circular references

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view team profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their shop" ON shops;
DROP POLICY IF EXISTS "Owners can update their shop" ON shops;
DROP POLICY IF EXISTS "Allow shop creation" ON shops;
DROP POLICY IF EXISTS "Users can view profiles in their shop" ON profiles;
DROP POLICY IF EXISTS "Users can view their own shop" ON shops;
DROP POLICY IF EXISTS "Owners can update their shop" ON shops;
DROP POLICY IF EXISTS "Anyone can view active barbers" ON barbers;
DROP POLICY IF EXISTS "Shop members can manage barbers" ON barbers;
DROP POLICY IF EXISTS "Anyone can view enabled services" ON services;
DROP POLICY IF EXISTS "Shop members can manage services" ON services;
DROP POLICY IF EXISTS "Shop members can view their shop appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
DROP POLICY IF EXISTS "Shop members can update appointments" ON appointments;
DROP POLICY IF EXISTS "Shop members can view settings" ON shop_settings;
DROP POLICY IF EXISTS "Owners can update settings" ON shop_settings;

-- Now recreate with proper non-circular policies

-- =====================================================
-- PROFILES - Most basic, no dependencies
-- =====================================================
CREATE POLICY "Enable read access for own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable update for own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- SHOPS - Can reference profiles but not vice versa
-- =====================================================
CREATE POLICY "Enable read shop for members" ON shops
    FOR SELECT USING (
        id IN (
            SELECT shop_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "Enable insert shop for authenticated users" ON shops
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update shop for owners" ON shops
    FOR UPDATE USING (
        id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'owner'
        )
    );

-- =====================================================
-- BARBERS - References shops
-- =====================================================
CREATE POLICY "Enable read all barbers" ON barbers
    FOR SELECT USING (true);  -- Public read for customer booking

CREATE POLICY "Enable insert barbers for shop members" ON barbers
    FOR INSERT WITH CHECK (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Enable update barbers for shop members" ON barbers
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Enable delete barbers for shop members" ON barbers
    FOR DELETE USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- SERVICES - References shops
-- =====================================================
CREATE POLICY "Enable read all services" ON services
    FOR SELECT USING (true);  -- Public read for customer booking

CREATE POLICY "Enable insert services for shop members" ON services
    FOR INSERT WITH CHECK (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Enable update services for shop members" ON services
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Enable delete services for shop members" ON services
    FOR DELETE USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- APPOINTMENTS - References shops
-- =====================================================
CREATE POLICY "Enable read appointments for shop members" ON appointments
    FOR SELECT USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "Enable insert appointments for all" ON appointments
    FOR INSERT WITH CHECK (true);  -- Anyone can book

CREATE POLICY "Enable update appointments for shop members" ON appointments
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

-- =====================================================
-- SHOP_SETTINGS - References shops
-- =====================================================
CREATE POLICY "Enable read settings for shop members" ON shop_settings
    FOR SELECT USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "Enable insert settings for shop owners" ON shop_settings
    FOR INSERT WITH CHECK (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'owner'
        )
    );

CREATE POLICY "Enable update settings for shop owners" ON shop_settings
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'owner'
        )
    );

-- =====================================================
-- BLOCKED_TIMES - References shops
-- =====================================================
CREATE POLICY "Enable all operations for shop members on blocked_times" ON blocked_times
    FOR ALL USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin', 'barber')
        )
    );

-- =====================================================
-- CUSTOMERS - References shops
-- =====================================================
CREATE POLICY "Enable all operations for shop members on customers" ON customers
    FOR ALL USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );