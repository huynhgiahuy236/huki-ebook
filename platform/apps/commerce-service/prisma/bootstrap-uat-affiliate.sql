INSERT INTO affiliate_profiles (
  id, user_id, affiliate_code, display_name, bio, contact_email, contact_phone,
  applicant_type, promotion_description, content_categories, promotion_methods,
  payout_setup_later, status, created_at, updated_at
)
VALUES (
  'affp-0000-4000-8000-000000000001',
  'aff0-0000-4000-8000-000000000004',
  'HUKITOPKOC',
  'Trần Review Sách (Top KOC)',
  'Kênh review sách uy tín hàng đầu cho độc giả HuKi',
  'affiliate@huki.com',
  '0907778888',
  'INDIVIDUAL',
  'Chia sẻ link review và bài viết chọn lọc trên mạng xã hội',
  '["LITERATURE", "SELF_HELP", "BUSINESS"]'::jsonb,
  '["SOCIAL_MEDIA", "BLOG"]'::jsonb,
  true,
  'ACTIVE',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET status = 'ACTIVE';
