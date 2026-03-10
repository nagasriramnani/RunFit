import { supabase } from "@/lib/supabase";
import { ZoneCoord } from "@/contexts/GameContext";

export async function createRun(userId: string): Promise<string> {
    const { data, error } = await supabase
        .from("runs")
        .insert({
            user_id: userId,
            status: "active",
            distance_km: 0,
            duration_seconds: 0,
        })
        .select("id")
        .single();

    if (error) throw error;
    return data.id;
}

export async function uploadRunPoints(
    runId: string,
    userId: string,
    points: { coord: ZoneCoord; speedLimit: boolean; accuracy: number; time: Date; heading?: number }[]
) {
    if (points.length === 0) return;

    const records = points.map((p) => ({
        run_id: runId,
        user_id: userId,
        geom: `POINT(${p.coord.longitude} ${p.coord.latitude})`,
        speed: p.speedLimit ? 15.0 : 0.0, // using placeholder since current method just checks overspeed
        accuracy: p.accuracy,
        heading: p.heading || 0,
        timestamp: p.time.toISOString(),
    }));

    const { error } = await supabase.from("run_points").insert(records);
    if (error) throw error;
}

export async function stopRun(runId: string, distanceKm: number, durationSecs: number) {
    const { error } = await supabase
        .from("runs")
        .update({
            end_time: new Date().toISOString(),
            distance_km: distanceKm,
            duration_seconds: durationSecs,
            status: "processing", // handoff to edge function
        })
        .eq("id", runId);

    if (error) throw error;
}

export async function finalizeRun(runId: string) {
    const { data, error } = await supabase.functions.invoke("finalize-run", {
        body: { runId },
    });

    if (error) throw error;
    return data;
}
