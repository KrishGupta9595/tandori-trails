# Tandoori Trails - Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `tandoori-trails`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
6. Click "Create new project"
7. Wait for the project to be created (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public key** (starts with `eyJ`)

## Step 3: Set Environment Variables

Create a `.env.local` file in your project root:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
\`\`\`

## Step 4: Run Database Setup

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `scripts/04-complete-setup.sql`
4. Click "Run" to execute the script
5. Verify tables are created in **Database** → **Tables**

## Step 5: Create User Accounts

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users**
2. Click "Add user"
3. Create Kitchen User:
   - **Email**: `kitchen@gmail.com`
   - **Password**: `password`
   - **Auto Confirm User**: ✅ (checked)
4. Click "Create user"
5. Repeat for Admin User:
   - **Email**: `admin@gmail.com`
   - **Password**: `password`
   - **Auto Confirm User**: ✅ (checked)

### Method 2: Using SQL (Alternative)

If you prefer SQL, run this in the SQL Editor:

\`\`\`sql
-- Insert auth users (this will trigger our function to create staff_users)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'kitchen@gmail.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
), (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@gmail.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
\`\`\`

## Step 6: Configure Authentication Settings

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, add your domain:
   - For development: `http://localhost:3000`
   - For production: `https://your-domain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/**` (for development)
   - `https://your-domain.com/**` (for production)

## Step 7: Test the Setup

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Click "Staff Login" → "Kitchen Login"
4. Use credentials: `kitchen@gmail.com` / `password`
5. You should be redirected to the kitchen dashboard
6. Test admin login with: `admin@gmail.com` / `password`

## Step 8: Enable Real-time (Optional)

1. Go to **Database** → **Replication**
2. Enable replication for these tables:
   - `orders`
   - `order_items`
   - `menu_items`
   - `categories`

## Troubleshooting

### Users Can't Login
- Check if users exist in **Authentication** → **Users**
- Verify email confirmation status
- Check if staff_users records were created

### Database Errors
- Verify all tables were created successfully
- Check RLS policies are enabled
- Ensure triggers are working

### Environment Variables
- Double-check `.env.local` file exists
- Restart development server after adding env vars
- Verify URLs don't have trailing slashes

## Production Deployment

For production deployment:

1. Update environment variables in your hosting platform
2. Update Site URL and Redirect URLs in Supabase
3. Consider enabling additional security features
4. Set up proper backup strategies

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify all SQL scripts ran successfully
3. Test authentication in Supabase dashboard first
4. Check browser console for errors
\`\`\`

Now let me create a simple verification script:
