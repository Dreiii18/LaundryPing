import type { NextConfig } from "next";

// Validate required environment variables at build/startup time
if (process.env.NODE_ENV !== 'test') {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PHONE_ENCRYPTION_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nSee .env.local.example for reference.`
    );
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
