INSERT INTO delivery_staff (id, user_id, name, phone, email, status, created_at, updated_at)
VALUES (
  'dstf-0000-4000-8000-000000000001',
  'ship-0000-4000-8000-000000000003',
  'Nguyễn Văn Giao (Shipper HUKI)',
  '0908889999',
  'shipper@huki.com',
  'ACTIVE',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET status = 'ACTIVE';
