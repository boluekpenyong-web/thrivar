import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["not_started", "in_progress", "completed"];

// Updates one assignment: its status (with the completion date) and/or her notes.
export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing assignment" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    update.status = body.status;
    update.completed_at = body.status === "completed" ? new Date().toISOString() : null;
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") {
      return NextResponse.json({ error: "Notes must be text" }, { status: 400 });
    }
    update.notes = body.notes.slice(0, 3000);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("weekly_assignments")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, status, notes, completed_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save that. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assignment: data });
}
