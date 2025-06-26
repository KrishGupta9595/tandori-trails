-- Complete Supabase setup for Tandoori Trails
-- Run this after setting up your Supabase project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;

-- Create tables
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL UNIQUE,
  table_number INTEGER NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(15) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'prepared', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE staff_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('kitchen', 'admin')),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_staff_users_email ON staff_users(email);
CREATE INDEX idx_staff_users_auth_user ON staff_users(auth_user_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- Create policies for public access to menu data
CREATE POLICY "Allow public read access to categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to menu_items" ON menu_items FOR SELECT USING (true);

-- Create policies for orders (customers can create, staff can manage)
CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public update orders" ON orders FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read order_items" ON order_items FOR SELECT USING (true);

-- Staff policies (authenticated users only)
CREATE POLICY "Allow authenticated users to manage categories" ON categories 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage menu_items" ON menu_items 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage orders" ON orders 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage order_items" ON order_items 
  FOR ALL USING (auth.role() = 'authenticated');

-- Staff users policies
CREATE POLICY "Allow authenticated users to read staff_users" ON staff_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage staff_users" ON staff_users
  FOR ALL USING (auth.role() = 'authenticated');

-- Function to handle new user registration
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

-- Insert sample categories
INSERT INTO categories (name, display_order) VALUES
('Starters', 1),
('Mains', 2),
('Breads', 3),
('Desserts', 4),
('Beverages', 5);

-- Insert sample menu items
DO $$
DECLARE
    starters_id UUID;
    mains_id UUID;
    breads_id UUID;
    desserts_id UUID;
    beverages_id UUID;
BEGIN
    SELECT id INTO starters_id FROM categories WHERE name = 'Starters';
    SELECT id INTO mains_id FROM categories WHERE name = 'Mains';
    SELECT id INTO breads_id FROM categories WHERE name = 'Breads';
    SELECT id INTO desserts_id FROM categories WHERE name = 'Desserts';
    SELECT id INTO beverages_id FROM categories WHERE name = 'Beverages';

    -- Insert menu items with sample images
    INSERT INTO menu_items (category_id, name, description, price, image_url) VALUES
    -- Starters
    (starters_id, 'Tandoori Chicken', 'Succulent chicken marinated in yogurt and spices, cooked in tandoor', 350.00, '/placeholder.svg?height=200&width=200'),
    (starters_id, 'Paneer Tikka', 'Cottage cheese cubes marinated in spices and grilled to perfection', 280.00, '/placeholder.svg?height=200&width=200'),
    (starters_id, 'Seekh Kebab', 'Minced lamb seasoned with herbs and spices, grilled on skewers', 320.00, '/placeholder.svg?height=200&width=200'),
    (starters_id, 'Samosa', 'Crispy pastry filled with spiced potatoes and peas', 80.00, '/placeholder.svg?height=200&width=200'),
    
    -- Mains
    (mains_id, 'Butter Chicken', 'Tender chicken in rich tomato and cream sauce', 420.00, '/placeholder.svg?height=200&width=200'),
    (mains_id, 'Dal Makhani', 'Creamy black lentils slow-cooked with butter and spices', 280.00, '/placeholder.svg?height=200&width=200'),
    (mains_id, 'Biryani Chicken', 'Fragrant basmati rice layered with spiced chicken', 380.00, '/placeholder.svg?height=200&width=200'),
    (mains_id, 'Palak Paneer', 'Cottage cheese in creamy spinach gravy', 320.00, '/placeholder.svg?height=200&width=200'),
    (mains_id, 'Lamb Curry', 'Tender lamb cooked in aromatic spices and onion gravy', 480.00, '/placeholder.svg?height=200&width=200'),
    
    -- Breads
    (breads_id, 'Naan', 'Soft leavened bread baked in tandoor', 60.00, '/placeholder.svg?height=200&width=200'),
    (breads_id, 'Garlic Naan', 'Naan topped with fresh garlic and herbs', 80.00, '/placeholder.svg?height=200&width=200'),
    (breads_id, 'Roti', 'Whole wheat flatbread', 40.00, '/placeholder.svg?height=200&width=200'),
    (breads_id, 'Kulcha', 'Stuffed bread with onions and spices', 90.00, '/placeholder.svg?height=200&width=200'),
    
    -- Desserts
    (desserts_id, 'Gulab Jamun', 'Sweet milk dumplings in sugar syrup', 120.00, '/placeholder.svg?height=200&width=200'),
    (desserts_id, 'Kulfi', 'Traditional Indian ice cream with cardamom', 100.00, '/placeholder.svg?height=200&width=200'),
    (desserts_id, 'Ras Malai', 'Soft cottage cheese dumplings in sweet milk', 140.00, '/placeholder.svg?height=200&width=200'),
    
    -- Beverages
    (beverages_id, 'Lassi Sweet', 'Traditional yogurt drink', 80.00, '/placeholder.svg?height=200&width=200'),
    (beverages_id, 'Masala Chai', 'Spiced Indian tea', 50.00, '/placeholder.svg?height=200&width=200'),
    (beverages_id, 'Fresh Lime Water', 'Refreshing lime drink', 60.00, '/placeholder.svg?height=200&width=200'),
    (beverages_id, 'Mango Juice', 'Fresh mango juice', 90.00, '/placeholder.svg?height=200&width=200');
END $$;

-- Insert sample orders for testing
INSERT INTO orders (table_number, customer_name, customer_phone, total_amount, status) VALUES
(1, 'Rahul Sharma', '9876543210', 850.00, 'completed'),
(2, 'Priya Patel', '9876543211', 650.00, 'preparing'),
(3, 'Amit Kumar', '9876543212', 420.00, 'pending'),
(4, 'Sneha Singh', '9876543213', 780.00, 'prepared');
