import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/hr/dashboard/charts/monthly
 * Returns monthly application counts aggregated server-side
 * Instead of fetching ALL applications and counting in JS
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'HR' && profile.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Single RPC call — SQL aggregation, SECURITY DEFINER bypasses per-row RLS
    const { data: rows, error } = await supabase
      .rpc('get_monthly_application_counts', profile.role === 'HR'
        ? { p_user_id: user.id }
        : {}
      );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const data = (rows ?? []).map((row: any) => ({
      month: row.month,
      applications: Number(row.application_count),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
