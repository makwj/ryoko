/**
 * Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client for database operations.
 * Configures the client with environment variables for URL and anonymous key.
 * Used throughout the application for database queries, authentication, and real-time features.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase configuration loaded

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
