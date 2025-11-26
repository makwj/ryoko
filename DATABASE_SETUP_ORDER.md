# Database Setup

## Run `database_setup.sql`

This single file contains the complete database schema with all features:

- All tables (profiles, trips, activities, expenses, settlements, gallery, ideas, invitations, activity_logs, posts, trip_comments, trip_reactions, trip_bookmarks)
- All RLS policies including banned user restrictions
- Storage buckets and policies
- All indexes for performance
- Triggers for updated_at columns

## Important Notes

- RLS policies allow public viewing of shared trips (`shared_to_social = TRUE`)
- The view page (`/trip/view/[id]`) allows viewing ANY trip via shareable link (not just shared_to_social trips)
- Banned users are blocked from writing to posts, trip_comments, and trip_reactions
- Make sure to configure environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_PLACES_API_KEY` (optional)
  - `GOOGLE_GEMINI_API_KEY` (optional)
  - `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` (optional)
  - `NEXT_PUBLIC_PIXABAY_API_KEY` (optional)
  - `NEXT_PUBLIC_MAPBOX_TOKEN` (optional)
  - `WEATHERAPI_API_KEY` (optional)

## For New Deployments

Run `database_setup.sql` on a fresh Supabase database.

## For Existing Deployments

If you already have tables set up, some statements may fail due to existing objects. This is expected - the file will create all missing tables, columns, and policies.

