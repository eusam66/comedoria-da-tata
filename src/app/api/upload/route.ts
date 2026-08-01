import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { removeStorageFileByPublicUrl } from '@/lib/storageAdmin';

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const bucket = String(form.get('bucket') || 'dishes');
    const path = String(form.get('path') || `uploads/${Date.now()}_${(file as File)?.name || 'bin'}`);
    if (!file) return NextResponse.json({ error: 'no file provided' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, Buffer.from(buffer), { cacheControl: '3600', upsert: true });
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
