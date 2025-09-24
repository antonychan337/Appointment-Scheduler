-- Fix for infinite recursion in profiles policy
-- Drop the problematic policies first

DROP POLICY IF EXISTS "Users can view their own shop" ON shops;
DROP POLICY IF EXISTS "Owners can update their shop" ON shops;
DROP POLICY IF EXISTS "Users can view profiles in their shop" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate policies without circular references

-- Profiles policies (simplified - no circular reference)
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Shops policies (using direct auth.uid() check)
CREATE POLICY "Users can view their shop" ON shops
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.shop_id = shops.id
            AND profiles.id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their shop" ON shops
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.shop_id = shops.id
            AND profiles.id = auth.uid()
            AND profiles.role = 'owner'
        )
    );

CREATE POLICY "Allow shop creation" ON shops
    FOR INSERT WITH CHECK (true);

-- Also need to allow profiles to view other profiles in same shop
CREATE POLICY "Users can view team profiles" ON profiles
    FOR SELECT USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );