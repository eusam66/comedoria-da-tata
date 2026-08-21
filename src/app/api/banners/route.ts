import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json([]);

  const { data, error } = await (supabaseAdmin as any)
    .from('banners')
    .select('id,title,subtitle,image_url,link,alt,position')
    .eq('active', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('public banners GET', error);
    return NextResponse.json(
      { error: 'Promoções temporariamente indisponíveis.' },
      { status: 503 }
    );
  }

  return NextResponse.json(data || []);
}
