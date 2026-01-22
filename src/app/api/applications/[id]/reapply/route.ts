import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appendStatusHistory } from '@/lib/utils/statusHistory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Load application
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        applicant_id,
        job_id,
        status,
        status_history
      `)
      .eq('id', id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    if (app.applicant_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (app.status !== 'archived') {
      return NextResponse.json(
        { success: false, error: `Only archived applications can be reapplied. Current status: ${app.status}` },
        { status: 400 }
      );
    }

    // Ensure job still active
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, title')
      .eq('id', app.job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This job is not accepting applications.' },
        { status: 400 }
      );
    }

    // Ensure applicant is not currently hired (DB-free check)
    const { data: hiredApp, error: hiredCheckError } = await supabase
      .from('applications')
      .select('id')
      .eq('applicant_id', user.id)
      .eq('status', 'hired')
      .limit(1)
      .maybeSingle();

    if (hiredCheckError) {
      return NextResponse.json({ success: false, error: hiredCheckError.message }, { status: 500 });
    }

    if (hiredApp) {
      return NextResponse.json(
        { success: false, error: 'You are currently hired and cannot reapply yet.' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    const nextHistory = appendStatusHistory(
      app.status_history || [],
      'archived',
      'pending',
      user.id
    );

    const { data: updated, error: updateError } = await supabase
      .from('applications')
      .update({
        status: 'pending',
        updated_at: now,
        reviewed_by: null,
        reviewed_at: null,
        denial_reason: null,
        notification_sent: false,
        status_history: nextHistory,
      })
      .eq('id', id)
      .select('id, status')
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Reapplied successfully.' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Server error' }, { status: 500 });
  }
}
