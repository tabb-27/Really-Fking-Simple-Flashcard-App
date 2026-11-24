import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { fetchDashboardData } from '@/lib/data';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET() {
  const data = await fetchDashboardData();
  if (!data.configured) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    );
  }
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }
  return NextResponse.json({ sets: data.sets });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      collection_id?: string | null;
    };
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json(
        { error: 'Set title is required.' },
        { status: 400 }
      );
    }

    const collectionId = body.collection_id ? body.collection_id : null;

    const { data, error } = await supabase
      .from('sets')
      .insert({ title, collection_id: collectionId })
      .select('id, collection_id, title, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { set: { ...data, card_count: 0 } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }
}
