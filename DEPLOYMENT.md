# LaundryPing Deployment Guide

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." -> "Project"
3. Import your Git repository
4. Framework Preset: **Next.js** (auto-detected)
5. Root Directory: `.` (default)

### 2. Configure Environment Variables

In the Vercel project dashboard -> Settings -> Environment Variables, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | From Supabase -> Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Keep secret! Server-side only |
| `SEMAPHORE_API_KEY` | Your API key | From semaphore.co dashboard |
| `SEMAPHORE_SENDER_NAME` | `LaundryPing` | Or your custom sender name |
| `PHONE_ENCRYPTION_KEY` | 64-char hex string | Generate: `openssl rand -hex 32` |
| `SMS_PROVIDER` | `semaphore` | Use `semaphore` for production |

### 3. Configure Region

In Project Settings -> Functions -> Region, select **Singapore (sin1)** for lowest latency to Philippine users.

### 4. Deploy

Click "Deploy" or push to your main branch. Vercel will build and deploy automatically.

## Supabase Production Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. **Region: Singapore (ap-southeast-1)** -- critical for PH latency
4. Set a strong database password

### 2. Run Migration

1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the contents of `supabase/migrations/00001_initial_schema.sql`
3. Click "Run"
4. Verify all tables, policies, and functions are created

### 3. Get API Keys

From Supabase -> Settings -> API:
- **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** -> `SUPABASE_SERVICE_ROLE_KEY`

### 4. Configure Auth

In Supabase -> Authentication -> Settings:
- Enable Email provider
- Disable email confirmation for MVP (or configure SMTP)
- Set Site URL to your Vercel deployment URL

## SMS Provider Setup (Semaphore)

1. Register at [semaphore.co](https://semaphore.co)
2. Get your API key from the dashboard
3. Purchase SMS credits (PHP 0.50 per SMS)
4. Optional: Register a custom sender name (costs extra, takes 1-2 weeks approval)
5. Set `SMS_PROVIDER=semaphore` in your environment

## Post-Deployment Verification Checklist

- [ ] Visit your deployed URL -- login page loads
- [ ] Create a new account -- signup works, redirects to dashboard
- [ ] Add a machine -- appears in machines list
- [ ] Create a job -- appears in today's jobs
- [ ] Mark job done -- SMS sent (or mock confirmation in dev)
- [ ] Check SMS usage -- quota bar shows correct count
- [ ] Update settings -- shop name persists
- [ ] Log out and back in -- session works correctly
- [ ] Test on mobile device -- responsive layout works
- [ ] Check Supabase logs -- no RLS policy violations

## Custom Domain (Optional)

1. In Vercel -> Project Settings -> Domains
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. SSL is automatic

## Monitoring

- **Vercel**: Built-in analytics and function logs
- **Supabase**: Database metrics, auth logs, API logs
- **Semaphore**: SMS delivery reports and credit balance
