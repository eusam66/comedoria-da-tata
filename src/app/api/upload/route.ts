import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { removeStorageFileByPublicUrl } from '@/lib/storageAdmin';
import { requireAdmin } from '@/lib/adminAuthSafe';

const ALLOWED_BUCKETS = new Set(['dishes', 'banners', 'branding']);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function safeObjectPath(bucket: string, originalName: string) {
  const extension = originalName.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/)?.[0] || '';
  return `uploads/${bucket}/${crypto.randomUUID()}${extension}`;
}

async function ensureBucketExists(bucket: string) {
  if (!supabaseAdmin) return;
  const { data: existing, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw listError;
  if (existing?.some((item) => item.name === bucket)) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: '10MB'
  });
  if (createError && !String(createError.message || '').toLowerCase().includes('already exists')) {
    throw createError;
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const bucket = String(form.get('bucket') || 'dishes');
    if (!file) return NextResponse.json({ error: 'no file provided' }, { status: 400 });
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'invalid bucket' }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'unsupported image type' }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'image must be between 1 byte and 10 MB' }, { status: 413 });
    }

    const path = safeObjectPath(bucket, file.name);

    await ensureBucketExists(bucket);

    const buffer = await file.arrayBuffer();
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, Buffer.from(buffer), {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false
    });
    if (error) {
      console.error('upload error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ path, publicUrl: urlData.publicUrl });
  } catch (err:any) {
    console.error('upload route error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin(req);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 });
    }

    const body = await req.json();
    const publicUrl = typeof body?.publicUrl === 'string' ? body.publicUrl : '';
    if (!publicUrl) {
      return NextResponse.json({ error: 'publicUrl is required' }, { status: 400 });
    }

    const removed = await removeStorageFileByPublicUrl(publicUrl);
    return NextResponse.json({ ok: removed });
  } catch (err:any) {
    console.error('upload delete route error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
