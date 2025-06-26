-- Create auth users and link them to staff_users table
-- Note: These users need to be created in Supabase Auth dashboard as well

-- First, let's update our staff_users table structure
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if this email should be a staff user
  IF NEW.email IN ('kitchen@gmail.com', 'admin@gmail.com') THEN
    INSERT INTO public.staff_users (auth_user_id, email, role, name)
    VALUES (
      NEW.id,
      NEW.email,
      CASE 
        WHEN NEW.email = 'kitchen@gmail.com' THEN 'kitchen'
        WHEN NEW.email = 'admin@gmail.com' THEN 'admin'
        ELSE 'kitchen'
      END,
      CASE 
        WHEN NEW.email = 'kitchen@gmail.com' THEN 'Kitchen Staff'
        WHEN NEW.email = 'admin@gmail.com' THEN 'Restaurant Admin'
        ELSE 'Staff Member'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies for staff_users
DROP POLICY IF EXISTS "Allow authenticated users to read staff_users" ON staff_users;
CREATE POLICY "Allow authenticated users to read staff_users" ON staff_users
  FOR SELECT USING (auth.uid() = auth_user_id OR auth.role() = 'authenticated');

-- Insert or update existing staff users (if they don't exist)
INSERT INTO staff_users (email, role, name) VALUES
('kitchen@gmail.com', 'kitchen', 'Kitchen Staff'),
('admin@gmail.com', 'admin', 'Restaurant Admin')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name;
