import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "./server";

/**
 * Creates a Supabase client with admin privileges using the service role key.
 * This client bypasses Row Level Security (RLS) policies.
 * 
 * If SUPABASE_SERVICE_ROLE_KEY is not defined in the environment, it falls back
 * to the standard cookie-based user client with a warning.
 */
export async function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && supabaseUrl) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  console.warn(
    "WARNING: SUPABASE_SERVICE_ROLE_KEY is not defined. Falling back to the cookie-based user client. " +
    "Database updates might fail if Row Level Security (RLS) policies are active."
  );
  return await createServerClient();
}
