// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kdgfsjdrqzvzvycxjqzb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2ZzamRycXp2enZ5Y3hqcXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDIyNDksImV4cCI6MjA2ODY3ODI0OX0.2Up14wOjjvQH2PevW5_NvwuGWW-I494vqsJ35Ud6IVA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});