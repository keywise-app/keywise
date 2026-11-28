import {supabase} from './supabase';
import {workspaceApi} from './workspace-api';

export function leaseFileType(file: Pick<File,'name'|'type'|'size'>) {
 if(file.size>10*1024*1024) throw new Error('Use a lease under 10 MB.');
 const types:Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
 const inferred=types[file.name.split('.').pop()?.toLowerCase() || ''];
 const type=file.type && file.type!=='application/octet-stream'?file.type:inferred;
 if(!Object.values(types).includes(type)) throw new Error('Use a PDF, JPEG, PNG or WebP lease.');
 return type;
}
export async function uploadLease(file:File) {
 const type=leaseFileType(file);
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) throw new Error('Please sign in again.');
 const storage_path=`${user.id}/lease-${crypto.randomUUID()}`;
 const {error}=await supabase.storage.from('workspace-sources').upload(storage_path,file,{contentType:type});
 if(error) throw new Error(`Could not upload ${file.name}: ${error.message}. Retry after checking your connection. If the source bucket is unavailable, contact support.`);
 return {storage_path,filename:file.name,fileType:type};
}
export async function extractUploadedLease(source:{storage_path:string;fileType:string}) {
 return workspaceApi('/api/extract-lease',{method:'POST',body:JSON.stringify(source)});
}
