# Thrivar — Phase 2b (Transformation Map)

Builds on Phase 2a's Six Pillars assessment by adding the AI-generated
Transformation Map: a real narrative interpretation of your assessment
results, generated server-side and cached to your profile.

## 1. Get an Anthropic API key (new requirement this phase)

1. Go to console.anthropic.com, sign in (or create an account)
2. Go to API Keys, create a new key
3. Copy it somewhere safe - you won't be able to see it again after this
4. This is a SECRET key - never paste it into a chat, never commit it to
   GitHub. It only ever goes into Vercel's environment variables (step 3).

## 2. Run the updated schema

Supabase -> SQL Editor -> New query -> paste in `supabase/schema.sql` -> Run
(choose "Run and enable RLS" if asked). This adds the new
`transformation_map` column and the UPDATE permission the new feature needs.

## 3. Add the new environment variable in Vercel

Project -> Settings -> Environment Variables -> add:

    ANTHROPIC_API_KEY = (the key from step 1)

Keep the two existing Supabase variables as they are.

## 4. Deploy

Upload this whole folder to GitHub the same way as before (drag the closed
folder in, not individual files), then redeploy in Vercel once the env
variable from step 3 is saved.

## 5. Test

Take the assessment again (or log in fresh). After the last question you'll
see "Reading your landscape..." for a few seconds while the AI generates
your Transformation Map, then land on a dashboard showing the real
narrative - what's changing, what's staying, current tension (if genuinely
present), what's in the way, your Current Edge in context, what matters
now, and your next move.

## What's next

Home / NOW screen, Personalized Plan, Journal, minimal Becoming Log, then
the Coach with real context and support modes.
