import supabaseAdmin from './supabaseAdmin';

function adminStorage() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabaseAdmin.storage;
}

export function parseStoragePublicUrl(publicUrl: string | null | undefined): { bucket: string; path: string } | null {
  if (!publicUrl || typeof publicUrl !== 'string') return null;

  try {
    const url = new URL(publicUrl);
    const marker = '/storage/v1/object/public/';
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const storagePath = url.pathname.slice(index + marker.length);
    const firstSlash = storagePath.indexOf('/');
    if (firstSlash === -1) return null;

    const bucket = storagePath.slice(0, firstSlash);
    const path = storagePath.slice(firstSlash + 1);
    if (!bucket || !path) return null;

    return { bucket, path };
  } catch {
    return null;
  }
}

export async function removeStorageFileByPublicUrl(publicUrl: string | null | undefined) {
  const parsed = parseStoragePublicUrl(publicUrl);
  if (!parsed) return false;
  if (!['dishes', 'banners', 'branding'].includes(parsed.bucket)) return false;

  const configuredUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl || new URL(publicUrl!).origin !== new URL(configuredUrl).origin) return false;

  const { error } = await adminStorage().from(parsed.bucket).remove([parsed.path]);
  if (error) throw error;
  return true;
}
