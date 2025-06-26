-- Enable real-time for all necessary tables
-- Run this in Supabase SQL Editor to ensure real-time works properly

-- Enable real-time on orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable real-time on order_items table  
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Enable real-time on menu_items table (for menu updates)
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- Enable real-time on categories table (for category updates)
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- Verify real-time is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
