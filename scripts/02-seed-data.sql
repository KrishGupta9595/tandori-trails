-- Seed data for Tandoori Trails

-- Insert categories
INSERT INTO categories (name, display_order) VALUES
('Starters', 1),
('Mains', 2),
('Breads', 3),
('Desserts', 4),
('Beverages', 5);

-- Get category IDs for menu items
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

    -- Insert menu items
    INSERT INTO menu_items (category_id, name, description, price) VALUES
    -- Starters
    (starters_id, 'Tandoori Chicken', 'Succulent chicken marinated in yogurt and spices, cooked in tandoor', 350.00),
    (starters_id, 'Paneer Tikka', 'Cottage cheese cubes marinated in spices and grilled to perfection', 280.00),
    (starters_id, 'Seekh Kebab', 'Minced lamb seasoned with herbs and spices, grilled on skewers', 320.00),
    (starters_id, 'Samosa', 'Crispy pastry filled with spiced potatoes and peas', 80.00),
    
    -- Mains
    (mains_id, 'Butter Chicken', 'Tender chicken in rich tomato and cream sauce', 420.00),
    (mains_id, 'Dal Makhani', 'Creamy black lentils slow-cooked with butter and spices', 280.00),
    (mains_id, 'Biryani Chicken', 'Fragrant basmati rice layered with spiced chicken', 380.00),
    (mains_id, 'Palak Paneer', 'Cottage cheese in creamy spinach gravy', 320.00),
    (mains_id, 'Lamb Curry', 'Tender lamb cooked in aromatic spices and onion gravy', 480.00),
    
    -- Breads
    (breads_id, 'Naan', 'Soft leavened bread baked in tandoor', 60.00),
    (breads_id, 'Garlic Naan', 'Naan topped with fresh garlic and herbs', 80.00),
    (breads_id, 'Roti', 'Whole wheat flatbread', 40.00),
    (breads_id, 'Kulcha', 'Stuffed bread with onions and spices', 90.00),
    
    -- Desserts
    (desserts_id, 'Gulab Jamun', 'Sweet milk dumplings in sugar syrup', 120.00),
    (desserts_id, 'Kulfi', 'Traditional Indian ice cream with cardamom', 100.00),
    (desserts_id, 'Ras Malai', 'Soft cottage cheese dumplings in sweet milk', 140.00),
    
    -- Beverages
    (beverages_id, 'Lassi Sweet', 'Traditional yogurt drink', 80.00),
    (beverages_id, 'Masala Chai', 'Spiced Indian tea', 50.00),
    (beverages_id, 'Fresh Lime Water', 'Refreshing lime drink', 60.00),
    (beverages_id, 'Mango Juice', 'Fresh mango juice', 90.00);
END $$;

-- Insert sample staff users (you'll need to create these in Supabase Auth)
INSERT INTO staff_users (email, role, name) VALUES
('kitchen@gmail.com', 'kitchen', 'Kitchen Staff'),
('admin@gmail.com', 'admin', 'Restaurant Admin');

-- Update menu items with sample image URLs
UPDATE menu_items SET image_url = '/placeholder.svg?height=200&width=200' WHERE name = 'Tandoori Chicken';
UPDATE menu_items SET image_url = '/placeholder.svg?height=200&width=200' WHERE name = 'Paneer Tikka';
UPDATE menu_items SET image_url = '/placeholder.svg?height=200&width=200' WHERE name = 'Butter Chicken';
UPDATE menu_items SET image_url = '/placeholder.svg?height=200&width=200' WHERE name = 'Biryani Chicken';
UPDATE menu_items SET image_url = '/placeholder.svg?height=200&width=200' WHERE name = 'Dal Makhani';
