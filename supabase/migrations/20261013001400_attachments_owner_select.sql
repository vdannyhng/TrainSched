-- Fix: Lehrkräfte sehen (und können damit löschen) alle Dateien in ihrem eigenen Ordner.
-- Supabase Storage braucht für remove() auch SELECT. Vorher hing das Leserecht nur am
-- Metadaten-Eintrag – nach dessen Löschen blieb die Datei verwaist zurück.
drop policy attachments_objects_select on storage.objects;
create policy attachments_objects_select on storage.objects
for select to authenticated
using (
  bucket_id = 'attachments'
  and (
    private.can_manage_teacher_data(private.storage_teacher_id(name))
    or exists (select 1 from public.attachments a where a.storage_path = name)
  )
);
