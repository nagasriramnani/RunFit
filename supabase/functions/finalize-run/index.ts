import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.44.0"

console.log("finalize-run started")

Deno.serve(async (req) => {
  const t0 = performance.now();
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  let finalRunId = 'unknown';

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { runId } = await req.json()
    if (!runId) throw new Error('Missing runId')
    finalRunId = runId;

    console.log(JSON.stringify({ level: 'info', event: 'finalize_run_start', run_id: runId, user_id: user.id }));

    // 1. Atomic Ownership and Status Transition check
    // We update status from 'active' to 'processing' atomically to prevent race conditions or repeated calls.
    const { data: run, error: runError } = await supabaseAdmin
      .from('runs')
      .update({ status: 'processing' })
      .eq('id', runId)
      .eq('status', 'active')
      .select('user_id, status')
      .single()

    if (runError || !run) {
      throw new Error('Run not found, already completed, or currently processing')
    }

    if (run.user_id !== user.id) {
      // Revert if mismatched owner (edge case)
      await supabaseAdmin.from('runs').update({ status: 'active' }).eq('id', runId)
      throw new Error('Run does not belong to user')
    }

    // 2. Anti-cheat validation
    const { data: cheatData, error: cheatError } = await supabaseAdmin.rpc('validate_run_integrity', { p_run_id: runId })
    if (cheatError) {
      console.log(JSON.stringify({ level: 'error', event: 'validation_rpc_failed', run_id: runId, error: cheatError.message }));
      throw cheatError;
    }

    if (!cheatData.is_valid) {
      await supabaseAdmin.from('runs').update({ status: 'invalid', is_valid: false, validation_reason: cheatData.reason }).eq('id', runId)
      console.log(JSON.stringify({ level: 'warn', event: 'validation_failed', run_id: runId, metrics: cheatData }));
      return new Response(JSON.stringify({ success: false, reason: cheatData.reason }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, status: 400 })
    }

    console.log(JSON.stringify({ level: 'info', event: 'validation_passed', run_id: runId, metrics: cheatData }));

    // 3. Territory Processing RPC
    const { data: captureData, error: captureError } = await supabaseAdmin.rpc('process_run_territory', { p_run_id: runId, p_user_id: user.id })
    if (captureError) {
      console.log(JSON.stringify({ level: 'error', event: 'capture_rpc_failed', run_id: runId, error: captureError.message }));
      throw captureError;
    }

    // 4. Mark run as completed
    await supabaseAdmin.from('runs').update({ status: 'completed' }).eq('id', runId)

    const ms = Math.round(performance.now() - t0);
    console.log(JSON.stringify({ level: 'info', event: 'finalize_run_success', run_id: runId, user_id: user.id, duration_ms: ms, capture: captureData }));

    return new Response(JSON.stringify({ success: true, metrics: cheatData, capture: captureData }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    })

  } catch (error) {
    const ms = Math.round(performance.now() - t0);
    console.log(JSON.stringify({ level: 'error', event: 'finalize_run_error', run_id: finalRunId, error: error.message || error, duration_ms: ms }));
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 400,
    })
  }
})
