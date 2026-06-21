import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "@/server/env";

/**
 * Server Supabase client bound to the current request's cookies. Operates as
 * the signed-in user, so Row Level Security applies to every query.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` is called from a Server Component where mutation isn't
          // allowed. Safe to ignore — middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * SERVICE-ROLE client. Bypasses Row Level Security. Use ONLY for trusted server
 * operations that genuinely need elevated access. Never expose to the client.
 */
export function createSupabaseServiceClient() {
  return createServerClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        /* no-op: service client is stateless */
      },
    },
  });
}
