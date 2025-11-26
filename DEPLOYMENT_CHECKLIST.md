# Deployment Checklist for Vercel

## Pre-Deployment Database Setup

Run `database_setup.sql` on your Supabase database. This single file contains everything:
- Complete database schema
- All tables, columns, and relationships
- RLS policies including banned user restrictions
- Storage buckets and policies
- Indexes and triggers

See `DATABASE_SETUP_ORDER.md` for detailed instructions.

## Environment Variables (Required in Vercel)

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

### Optional (Features may not work without these)
- `GOOGLE_PLACES_API_KEY` - For recommendations and nearby places
- `GOOGLE_GEMINI_API_KEY` - For AI chat recommendations
- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` - For destination images
- `NEXT_PUBLIC_PIXABAY_API_KEY` - Fallback for destination images
- `NEXT_PUBLIC_MAPBOX_TOKEN` - For location autocomplete
- `WEATHERAPI_API_KEY` - For weather information

## Files Cleaned Up

✅ Removed empty test directories:
- `src/app/api/test-attractions/`
- `src/app/api/test-places/`

## Code Changes Summary

### Recent Features Added
1. **Shareable Itinerary Links** - Users can generate shareable links to view trip itineraries in read-only mode
2. **Admin Portal** - Full admin system with user management, post/guide featuring
3. **Ban System** - Banned users are blocked from logging in
4. **Typewriter Effect** - Animated hero text on homepage
5. **Featured Content** - Posts and guides can be featured and appear in dedicated sections

### Database Schema Updates
- Added `share_caption` column to `trips` table
- Created `trip_comments` table for trip comments
- Created `trip_reactions` table for likes/dislikes
- Created `trip_bookmarks` table for bookmarking trips
- Added `role` and `is_banned` columns to `profiles` table
- Added `is_featured` column to `posts` table
- Added `is_featured_home` and `is_featured_social` columns to `trips` table

### RLS Policy Updates
- Public viewing of trips by ID (for shareable links)
- Public viewing of activities for any trip (for shareable links)
- Banned user restrictions on write operations
- Public read access for shared trips

## Vercel-Specific Notes

1. **Build Configuration**: 
   - ESLint and TypeScript errors are ignored during builds (configured in `next.config.ts`)
   - This allows deployment even with non-critical linting issues

2. **API Routes**:
   - `/api/debug-invitations` - Automatically disabled in production
   - All admin routes require service role authentication

3. **Image Domains**:
   - Configured for Supabase storage buckets
   - External image sources (Unsplash, Pixabay, Google Places) are handled via API routes

## Testing Before Deployment

1. ✅ Verify all SQL migrations run successfully
2. ✅ Check that RLS policies allow necessary operations
3. ✅ Test shareable link generation and viewing
4. ✅ Verify admin portal access (requires admin role)
5. ✅ Test ban system with a test user
6. ✅ Confirm environment variables are set in Vercel

## Post-Deployment

1. Run database migrations on production Supabase instance
2. Set all environment variables in Vercel dashboard
3. Verify build succeeds
4. Test critical paths:
   - User registration/login
   - Trip creation and editing
   - Shareable link generation
   - Admin portal access
   - Social feed functionality

## Security Notes

- Shareable links work by allowing public viewing of any trip by UUID
- UUIDs are cryptographically random and hard to guess (provides reasonable security)
- Admin operations require service role key
- Banned users are blocked at multiple levels (auth, routes, RLS)
- All write operations still require authentication (shareable links are read-only)

