-- Fix barber creation for testing without authentication
-- WARNING: This is for testing only! In production, require authentication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable insert barbers for shop members" ON barbers;
DROP POLICY IF EXISTS "Enable update barbers for shop members" ON barbers;
DROP POLICY IF EXISTS "Enable delete barbers for shop members" ON barbers;

-- Create more permissive policies for testing
CREATE POLICY "Allow public barber creation for testing" ON barbers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public barber updates for testing" ON barbers
    FOR UPDATE USING (true);

CREATE POLICY "Allow public barber deletion for testing" ON barbers
    FOR DELETE USING (true);