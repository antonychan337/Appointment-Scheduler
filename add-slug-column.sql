-- Migration to add slug column to shops table
-- This column stores the unique booking URL identifier for each shop

-- Add the slug column to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create an index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);

-- Add a comment to document the column
COMMENT ON COLUMN shops.slug IS 'Unique URL identifier for the shop booking page (e.g., /book/johns_barbershop)';

-- Update RLS policies to allow reading and updating slug
-- (Assuming you already have RLS policies, we just need to ensure they cover the new column)

-- Example: If you need to create a policy for shops table
-- CREATE POLICY "Users can update their own shop slug"
-- ON shops FOR UPDATE
-- USING (auth.uid() = owner_id)
-- WITH CHECK (auth.uid() = owner_id);