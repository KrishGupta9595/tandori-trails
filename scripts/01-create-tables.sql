-- Create tables for Tandoori Trails Restaurant App

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu items table
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

-- Orders table
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

-- Order items table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff users table (for kitchen and admin)
CREATE TABLE staff_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
CREATE POLICY "Allow public read own orders" ON orders FOR SELECT USING (true);

CREATE POLICY "Allow public insert on order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read order_items" ON order_items FOR SELECT USING (true);

-- Staff policies (authenticated users only)
CREATE POLICY "Allow authenticated users to manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage menu_items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage order_items" ON order_items FOR ALL USING (auth.role() = 'authenticated');
