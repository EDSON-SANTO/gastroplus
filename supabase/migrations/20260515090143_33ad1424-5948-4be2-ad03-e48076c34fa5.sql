
-- Storage policies for restaurant-images bucket
CREATE POLICY "Public can view restaurant images"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-images');

CREATE POLICY "Owners and admins can upload restaurant images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-images' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  )
);

CREATE POLICY "Owners and admins can update restaurant images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-images' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  )
);

CREATE POLICY "Owners and admins can delete restaurant images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-images' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  )
);

-- Promote demo-owner to admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'demo-owner@sabores.local'
ON CONFLICT (user_id, role) DO NOTHING;
