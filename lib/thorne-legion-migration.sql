-- Thorne/Ten Thousand/Legion Athletics migration
-- Run this in Supabase SQL Editor

-- Add new columns to rewards table
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'gift_card';
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS fulfillment_value TEXT;

-- Insert Thorne (active)
INSERT INTO public.rewards (brand_name, product_name, description, image_url, point_cost, retail_value, category, reward_type, fulfillment_value, affiliate_url, is_active, is_featured, is_hot, is_new)
VALUES ('Thorne', '20% Off Discount Code', 'Premium supplements — clean, tested, trusted', 'https://placehold.co/200x200/0A4C8A/FFFFFF?text=Thorne', 1500, 0, 'supplements', 'discount_code', '366666', 'https://www.thorne.com', true, true, true, true);

-- Insert Ten Thousand (coming soon / inactive — activate once approved)
-- INSERT INTO public.rewards (brand_name, product_name, description, image_url, point_cost, retail_value, category, reward_type, fulfillment_value, affiliate_url, is_active, is_featured, is_hot, is_new)
-- VALUES ('Ten Thousand', 'Discount Code', 'Premium performance apparel', 'https://placehold.co/200x200/000000/FFFFFF?text=TenThousand', 1500, 0, 'apparel', 'discount_code', NULL, 'https://www.tenthousand.cc', false, false, false, false);

-- To activate Ten Thousand once approved:
-- UPDATE public.rewards SET is_active = true, fulfillment_value = 'YOUR_CODE_HERE' WHERE brand_name = 'Ten Thousand';

-- Deactivate Legion Athletics
UPDATE public.rewards SET is_active = false WHERE brand_name ILIKE '%Legion%';
