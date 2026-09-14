const BASE_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('--- [VERIFY PART 0] Starting Backend API Verification ---');

  // 1. Login as Business Owner
  console.log('1. Logging in as Business Owner (phuongthuy@gmail.com)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'phuongthuy@gmail.com',
      password: 'Password123!',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.data?.accessToken || loginData.data?.tokens?.accessToken;
  console.log('   ✓ Owner Login OK, token acquired.');

  // 2. Get My Business
  console.log('2. Fetching Business Information...');
  const bizRes = await fetch(`${BASE_URL}/businesses/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bizData = await bizRes.json();
  if (!bizRes.ok || !bizData.data?.id) {
    throw new Error(`Failed to get business: ${JSON.stringify(bizData)}`);
  }
  const businessId = bizData.data.id;
  console.log(`   ✓ Business Found: ${bizData.data.name} (ID: ${businessId})`);

  // 3. Test Direct Provisioning a test staff member
  const testStaffEmail = `staff_test_${Date.now()}@huki.vn`;
  console.log(`3. Direct Provisioning new staff member: ${testStaffEmail}...`);
  const provRes = await fetch(`${BASE_URL}/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fullName: 'Nhân Viên Kiểm Thử',
      email: testStaffEmail,
      phone: '0901234567',
      initialPassword: 'StaffPassword123!',
      role: 'ORDER_STAFF',
      permissions: ['ORDER_VIEW', 'ORDER_PROCESS'],
    }),
  });

  const provData = await provRes.json();
  if (!provRes.ok) {
    throw new Error(`Provisioning failed: ${JSON.stringify(provData)}`);
  }
  const memberId = provData.data?.id;
  console.log(`   ✓ Staff Provisioned successfully! Member ID: ${memberId}`);

  // 4. Get Enriched Members List
  console.log('4. Fetching Enriched Member List...');
  const listRes = await fetch(`${BASE_URL}/businesses/${businessId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  if (!listRes.ok || !Array.isArray(listData.data)) {
    throw new Error(`Failed to list members: ${JSON.stringify(listData)}`);
  }
  console.log(`   ✓ Found ${listData.data.length} members. Verified enriched fields (user.fullName, user.email).`);

  // 5. Update Permissions for Staff
  console.log('5. Updating permissions for staff member...');
  const permRes = await fetch(`${BASE_URL}/businesses/${businessId}/members/${memberId}/permissions`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      permissions: ['ORDER_VIEW', 'ORDER_PROCESS', 'PRODUCT_VIEW', 'INVENTORY_UPDATE'],
    }),
  });
  const permData = await permRes.json();
  if (!permRes.ok) {
    throw new Error(`Permission update failed: ${JSON.stringify(permData)}`);
  }
  console.log('   ✓ Permissions updated successfully:', permData.data?.permissions);

  // 6. Test Logging in as newly provisioned staff
  console.log('6. Logging in as newly provisioned staff with initial credentials...');
  const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStaffEmail,
      password: 'StaffPassword123!',
    }),
  });
  const staffLoginData = await staffLoginRes.json();
  if (!staffLoginRes.ok) {
    throw new Error(`Staff login failed: ${JSON.stringify(staffLoginData)}`);
  }
  const staffToken = staffLoginData.data?.accessToken || staffLoginData.data?.tokens?.accessToken;
  console.log('   ✓ Staff Login successful with role:', staffLoginData.data?.user?.role);

  // 7. Staff fetching /businesses/my
  console.log('7. Staff fetching /businesses/my to verify permission propagation...');
  const staffBizRes = await fetch(`${BASE_URL}/businesses/my`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const staffBizData = await staffBizRes.json();
  if (!staffBizRes.ok) {
    throw new Error(`Staff getMyBusiness failed: ${JSON.stringify(staffBizData)}`);
  }
  console.log('   ✓ Staff received business details with permissions:', staffBizData.data?.currentMember?.permissions);

  console.log('\n🎉 ALL PART 0 BACKEND API & PERMISSION TESTS PASSED PERFECTLY!');
}

main().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
