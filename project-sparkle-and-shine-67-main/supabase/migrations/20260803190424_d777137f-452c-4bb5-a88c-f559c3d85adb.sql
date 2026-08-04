
CREATE POLICY "provider_docs_select_own_or_admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'provider-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "provider_docs_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'provider-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "provider_docs_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'provider-docs' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'provider-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "provider_docs_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'provider-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
