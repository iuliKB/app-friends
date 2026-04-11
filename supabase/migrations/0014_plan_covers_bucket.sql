-- Create plan-covers storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan-covers', 'plan-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload cover images
CREATE POLICY "Authenticated users can upload plan covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'plan-covers');

-- Allow authenticated users to update (upsert) their uploads
CREATE POLICY "Authenticated users can update plan covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'plan-covers');

-- Allow public read access to cover images
CREATE POLICY "Public read access for plan covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'plan-covers');
