-- Add optional cover image URL to plans (D-16)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS cover_image_url text;
