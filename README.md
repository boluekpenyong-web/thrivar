# Thrivar — Phase 2 (Six Pillars)

Builds on the working Phase 1 foundation (auth, hosting, database) with the
real Six Pillars assessment: Identity, Belonging, Purpose, Capacity,
Direction, Agency - plus per-pillar Current State and Current Edge
detection, all rule-based (no AI yet - that's the next step).

## 1. Run the new schema

In Supabase: SQL Editor -> New query -> paste in `supabase/schema.sql` ->
Run. This replaces the old six-dimension `profiles` table with the new
six-pillar structure. Safe to do since no real users have signed up yet.

## 2. Deploy

Upload this whole folder's contents to your GitHub repo (same way as
before - drag the closed folder in, not individual open files), then
Vercel will redeploy automatically.

## 3. Test

Log in (or sign up fresh). You should be redirected to `/assessment`
automatically since the schema reset means no profile exists yet. Answer
all 12 questions (two per pillar). On the last one you'll land on
`/dashboard`, now showing your six pillar states and your Current Edge -
either a specific one, or an honest "not enough evidence yet" if your
pillars are closely balanced.

## What's next (Phase 2b)

The Transformation Map: AI-generated narrative (what's changing, what's
staying, what's creating tension, what matters now) built on top of this
data, validated against real assessment results before it's wired into
Home.
