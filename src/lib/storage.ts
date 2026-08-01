import supabase from './supabase';

// Buckets used:
export const DISHES_BUCKET = 'dishes';
export const BANNERS_BUCKET = 'banners';
export const BRANDING_BUCKET = 'branding';

export async function uploadFile(bucket: string, path: string, file: File | Blob | Buffer, options: { cacheControl?: number } = {}) {
  // For client-side usage; server-side use supabaseAdmin.storage
  const up = await supabase.storage.from(bucket).upload(path, file as any, { cacheControl: String(options.cacheControl ?? 3600), upsert: false });
  if (up.error) throw up.error;
  // return public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

export async function removeFile(bucket: string, path: string) {
  const res = await supabase.storage.from(bucket).remove([path]);
  if (res.error) throw res.error;
  return true;
}

export function getPublicUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
