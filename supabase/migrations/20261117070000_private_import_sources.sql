begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('workspace-sources','workspace-sources',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "workspace source owner upload" on storage.objects for insert to authenticated
with check(bucket_id='workspace-sources' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "workspace source owner read" on storage.objects for select to authenticated
using(bucket_id='workspace-sources' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
