-- Fix authentication and create proper user accounts
-- This script creates the actual auth users and links them to staff_users

-- First, let's clean up existing data
DELETE FROM auth.users WHERE email IN ('kitchen@gmail.com', 'admin@gmail.com');
DELETE FROM staff_users WHERE email IN ('kitchen@gmail.com', 'admin@gmail.com');

-- Create kitchen user in auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'kitchen@gmail.com',
  crypt('kitchen123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{}',
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
);

-- Create admin user in auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@gmail.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{}',
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
);

-- Now create corresponding staff_users records
INSERT INTO staff_users (email, role, name) VALUES
('kitchen@gmail.com', 'kitchen', 'Kitchen Staff'),
('admin@gmail.com', 'admin', 'Restaurant Admin')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- Update RLS policies to be case-insensitive
DROP POLICY IF EXISTS "Allow authenticated users to read staff_users" ON staff_users;
CREATE POLICY "Allow authenticated users to read staff_users" ON staff_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create a function to check staff role (case-insensitive)
CREATE OR REPLACE FUNCTION check_staff_role(user_email text, required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_users 
    WHERE LOWER(email) = LOWER(user_email) 
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
