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
  return NextResponse.json({ collections: data.collections });
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
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('collections')
      .insert({ name })
      .select('id, name, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ collection: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }
}
