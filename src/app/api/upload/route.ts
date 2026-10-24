import { createHash } from 'node:crypto';
import { imageSignatureMatches } from '@/lib/imageUpload';
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { removeStorageFileByPublicUrlIfUnreferenced } from '@/lib/storageAdmin';
import { requireAdmin } from '@/lib/adminAuthSafe';

const ALLOWED_BUCKETS = new Set(['dishes', 'banners', 'branding']);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function safeObjectPath(bucket: string, originalName: string, requestedFolder: string) {
  const extension = originalName.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/)?.[0] || '';
  const folder = bucket === 'dishes' && requestedFolder === 'beverages' ? 'beverages' : bucket;
  return `uploads/${folder}/${crypto.randomUUID()}${extension}`;
}

async function ensureBucketExists(bucket: string) {
  if (!supabaseAdmin) return;
  const { data: existing, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw listError;
  if (existing?.some((item) => item.name === bucket)) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: '10MB',
  });
  if (
    createError &&
    !String(createError.message || '')
      .toLowerCase()
      .includes('already exists')
  ) {
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
    const folder = String(form.get('folder') || '');
    if (!file) return NextResponse.json({ error: 'no file provided' }, { status: 400 });
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'invalid bucket' }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'unsupported image type' }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'image must be between 1 byte and 10 MB' },
        { status: 413 }
      );
    }

    const buffer = await file.arrayBuffer();
    if (!imageSignatureMatches(file.type, new Uint8Array(buffer)))
      return NextResponse.json(
        { error: 'O conteúdo do arquivo não corresponde a uma imagem válida.' },
        { status: 415 }
      );
    const extension = (
      {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      } as Record<string, string>
    )[file.type];
    // Endereço pelo conteúdo somente para galerias: repetir após perda de rede
    // reutiliza o mesmo arquivo; nunca sobrescreve um objeto existente.
    const deduplicate = bucket === 'dishes' && form.get('deduplicate') === 'true';
    const uploadKey = String(form.get('uploadKey') || '');
    if (
      deduplicate &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadKey)
    )
      return NextResponse.json({ error: 'Identificador de upload inválido.' }, { status: 400 });
    const path = deduplicate
      ? `uploads/dishes/${uploadKey}-${createHash('sha256')
          .update(Buffer.from(buffer))
          .digest('hex')}.${extension}`
      : safeObjectPath(bucket, `image.${extension}`, folder);
    await ensureBucketExists(bucket);
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, Buffer.from(buffer), {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });
    const duplicate =
      deduplicate &&
      error &&
      (String((error as any).statusCode) === '409' ||
        (error as any).status === 409 ||
        error.message === 'The resource already exists');
    if (error && !duplicate) {
      console.error('upload error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ path, publicUrl: urlData.publicUrl });
  } catch (err: any) {
    console.error('upload route error', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
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

    const removed = await removeStorageFileByPublicUrlIfUnreferenced(publicUrl);
    return NextResponse.json({ ok: removed });
  } catch (err: any) {
    console.error('upload delete route error', err);
    const status = err.message === 'Forbidden' ? 403 : err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
