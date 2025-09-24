-- Remove the problematic trigger completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Make sure profiles table allows manual inserts
ALTER TABLE profiles ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN shop_id DROP NOT NULL;