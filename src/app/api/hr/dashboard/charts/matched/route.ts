import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/hr/dashboard/charts/matched
 * Returns application counts per job aggregated server-side
 * Instead of fetching ALL applications with full job joins
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'HR' && profile.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Single RPC call — SQL GROUP BY + ORDER BY + LIMIT 8
    const { data: rows, error } = await supabase
      .rpc('get_job_application_counts', profile.role === 'HR'
        ? { p_user_id: user.id }
        : {}
      );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const data = (rows ?? []).map((row: any) => ({
      jobTitle: row.job_title.length > 30
        ? row.job_title.substring(0, 30) + '...'
        : row.job_title,
      applications: Number(row.application_count),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
