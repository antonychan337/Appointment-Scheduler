-- Fix user creation issues

-- First, drop the existing trigger that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a simpler function that doesn't fail if profile already exists
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'owner'
    )
    ON CONFLICT (id) DO NOTHING;  -- Don't fail if profile already exists
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also ensure the profiles table has the right structure
ALTER TABLE profiles ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;