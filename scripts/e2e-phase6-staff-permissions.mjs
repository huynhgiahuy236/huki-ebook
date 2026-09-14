import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const API_BASE = 'http://localhost:3000/api/v1';
const WEB_BASE = 'http://localhost:3100';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message,
    };
  }
}

async function checkWeb() {
  try {
    const res = await fetch(WEB_BASE);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function extractToken(res) {
  const d = res.data?.data || res.data;
  return d?.tokens?.accessToken || d?.accessToken;
}

function extractUser(res) {
  const d = res.data?.data || res.data;
  return d?.user;
}

async function runE2ETests() {
  console.log('='.repeat(70));
  console.log('🚀 E2E TEST PHASE 06 — ADMIN CON & GRANULAR PERMISSIONS (RBAC)');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // STEP 0: Service Live Check
  // -------------------------------------------------------------
  console.log('\n📡 STEP 0: Checking Service Availability...');
  const webStatus = await checkWeb();
  assert(webStatus.ok, `Web Frontend alive at ${WEB_BASE} (Status: ${webStatus.status})`);

  const apiStatus = await request('/businesses/my');
  assert(apiStatus.status === 401, `API Gateway alive at ${API_BASE} (Auth Guard Working: 401 Unauthorized without token)`);

  // -------------------------------------------------------------
  // STEP 1: Owner Login & Fetch Business
  // -------------------------------------------------------------
  console.log('\n👑 STEP 1: Owner Login & Business Discovery...');
  const ownerLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'phuongthuy@gmail.com',
      password: 'Password123!',
    },
  });

  const ownerToken = extractToken(ownerLogin);
  assert(ownerLogin.ok && !!ownerToken, 'Owner (phuongthuy@gmail.com) login successful');

  const ownerBiz = await request('/businesses/my', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  const bizObj = ownerBiz.data?.data || ownerBiz.data;
  assert(ownerBiz.ok && !!bizObj?.id, `Owner business retrieved: "${bizObj?.name}" (ID: ${bizObj?.id})`);
  const businessId = bizObj?.id;

  // -------------------------------------------------------------
  // STEP 2: Owner Direct Provisioning Staff A (Sales)
  // -------------------------------------------------------------
  console.log('\n👤 STEP 2: Direct Provisioning Staff A (Sales Role)...');
  const ts = Date.now();
  const staffAEmail = `staff_sales_${ts}@huki.vn`;
  const staffAPhone = `090${Math.floor(1000000 + Math.random() * 9000000)}`;
  const staffAPassword = 'InitPassword123!';
  const staffAPermissions = ['ORDER_VIEW', 'ORDER_PROCESS', 'ORDER_CANCEL', 'PRODUCT_VIEW'];

  const provStaffA = await request(`/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      fullName: `Nguyễn Văn Bán Hàng ${ts.toString().slice(-4)}`,
      email: staffAEmail,
      phone: staffAPhone,
      initialPassword: staffAPassword,
      role: 'ORDER_STAFF',
      permissions: staffAPermissions,
    },
  });

  const staffAMember = provStaffA.data?.data || provStaffA.data;
  assert(provStaffA.ok && !!staffAMember?.id, `Staff A provisioned successfully (${staffAEmail}, Member ID: ${staffAMember?.id})`);
  const staffAMemberId = staffAMember?.id;

  // -------------------------------------------------------------
  // STEP 3: Owner Direct Provisioning Staff B (Warehouse / Content)
  // -------------------------------------------------------------
  console.log('\n📦 STEP 3: Direct Provisioning Staff B (Warehouse/Content Role)...');
  const tsB = ts + 123;
  const staffBEmail = `staff_wh_${tsB}@huki.vn`;
  const staffBPhone = `091${Math.floor(1000000 + Math.random() * 9000000)}`;
  const staffBPassword = 'InitPassword123!';
  const staffBPermissions = ['PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'INVENTORY_UPDATE'];

  const provStaffB = await request(`/businesses/${businessId}/members/provision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      fullName: `Trần Thủ Kho ${tsB.toString().slice(-4)}`,
      email: staffBEmail,
      phone: staffBPhone,
      initialPassword: staffBPassword,
      role: 'CONTENT_STAFF',
      permissions: staffBPermissions,
    },
  });

  const staffBMember = provStaffB.data?.data || provStaffB.data;
  assert(provStaffB.ok && !!staffBMember?.id, `Staff B provisioned successfully (${staffBEmail}, Member ID: ${staffBMember?.id})`);
  const staffBMemberId = staffBMember?.id;

  // -------------------------------------------------------------
  // STEP 4: Staff A Login, First-time Password Change & Re-login
  // -------------------------------------------------------------
  console.log('\n🔑 STEP 4: Staff A First-time Login & Password Change...');
  const staffALogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: staffAEmail,
      password: staffAPassword,
    },
  });

  const staffAUserData = extractUser(staffALogin);
  const staffATempToken = extractToken(staffALogin);
  assert(staffALogin.ok && staffAUserData?.mustChangePassword === true, 'Staff A login detects mustChangePassword = true');

  const staffANewPassword = 'NewSecurePassword123!';
  const changePwdRes = await request('/auth/change-password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffATempToken}` },
    body: {
      currentPassword: staffAPassword,
      newPassword: staffANewPassword,
    },
  });

  assert(changePwdRes.ok, 'Staff A changed initial password successfully');

  // Re-login with new password
  const staffAReLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: staffAEmail,
      password: staffANewPassword,
    },
  });

  const staffAReUserData = extractUser(staffAReLogin);
  const staffAToken = extractToken(staffAReLogin);
  assert(staffAReLogin.ok && staffAReUserData?.mustChangePassword === false, 'Staff A logged in with new password; mustChangePassword is now false');

  // -------------------------------------------------------------
  // STEP 5: RBAC Role & Permission Verification for Staff A & B
  // -------------------------------------------------------------
  console.log('\n🛡️ STEP 5: Verification of Staff Permissions & Access Discovery...');
  const staffABiz = await request('/businesses/my', {
    headers: { Authorization: `Bearer ${staffAToken}` },
  });

  const staffABizObj = staffABiz.data?.data || staffABiz.data;
  const staffACurMember = staffABizObj?.currentMember;
  assert(staffABiz.ok && staffACurMember?.role === 'ORDER_STAFF', 'Staff A discovers business with role = ORDER_STAFF');
  assert(
    JSON.stringify(staffACurMember?.permissions?.sort()) === JSON.stringify(staffAPermissions.sort()),
    `Staff A permissions match Sales preset (${staffAPermissions.join(', ')})`
  );

  // Staff B login
  const staffBLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: staffBEmail,
      password: staffBPassword,
    },
  });
  const staffBToken = extractToken(staffBLogin);

  const staffBBiz = await request('/businesses/my', {
    headers: { Authorization: `Bearer ${staffBToken}` },
  });

  const staffBBizObj = staffBBiz.data?.data || staffBBiz.data;
  const staffBCurMember = staffBBizObj?.currentMember;
  assert(staffBBiz.ok && staffBCurMember?.role === 'CONTENT_STAFF', 'Staff B discovers business with role = CONTENT_STAFF');
  assert(
    JSON.stringify(staffBCurMember?.permissions?.sort()) === JSON.stringify(staffBPermissions.sort()),
    `Staff B permissions match Warehouse preset (${staffBPermissions.join(', ')})`
  );

  // -------------------------------------------------------------
  // STEP 6: Dynamic Permission Modification by Owner
  // -------------------------------------------------------------
  console.log('\n⚙️ STEP 6: Owner Updates Staff A Permissions (Granting PRODUCT_CREATE)...');
  const updatedPermissions = [...staffAPermissions, 'PRODUCT_CREATE'];
  const updatePermRes = await request(`/businesses/${businessId}/members/${staffAMemberId}/permissions`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      permissions: updatedPermissions,
    },
  });

  const permUpdateData = updatePermRes.data?.data || updatePermRes.data;
  assert(updatePermRes.ok && permUpdateData?.permissions?.includes('PRODUCT_CREATE'), 'Owner updated Staff A permissions successfully');

  // Verify Staff A sees new permissions immediately
  const staffABizUpdated = await request('/businesses/my', {
    headers: { Authorization: `Bearer ${staffAToken}` },
  });
  const updatedMember = (staffABizUpdated.data?.data || staffABizUpdated.data)?.currentMember;
  assert(updatedMember?.permissions?.includes('PRODUCT_CREATE'), 'Staff A dynamic access reflects newly granted PRODUCT_CREATE permission');

  // -------------------------------------------------------------
  // STEP 7: Member Suspension & Reactivation
  // -------------------------------------------------------------
  console.log('\n🚫 STEP 7: Member Suspend & Reactivate Lifecycle...');
  // Suspend
  const suspendRes = await request(`/businesses/${businessId}/members/${staffAMemberId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: { status: 'SUSPENDED' },
  });
  const suspendData = suspendRes.data?.data || suspendRes.data;
  assert(suspendRes.ok && suspendData?.status === 'SUSPENDED', 'Staff A suspended by Owner');

  // Suspended staff attempts to access business -> getMyBusiness returns null/404
  const staffASuspendedAccess = await request('/businesses/my', {
    headers: { Authorization: `Bearer ${staffAToken}` },
  });
  const noBizFound = staffASuspendedAccess.status === 404 || staffASuspendedAccess.data?.data === null || !staffASuspendedAccess.data?.data?.id;
  assert(noBizFound, 'Suspended Staff A is denied business access (No active membership)');

  // Reactivate
  const reactivateRes = await request(`/businesses/${businessId}/members/${staffAMemberId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: { status: 'ACTIVE' },
  });
  const reactivateData = reactivateRes.data?.data || reactivateRes.data;
  assert(reactivateRes.ok && reactivateData?.status === 'ACTIVE', 'Staff A reactivated by Owner');

  const staffAReactivatedAccess = await request('/businesses/my', {
    headers: { Authorization: `Bearer ${staffAToken}` },
  });
  const reactivatedBizId = staffAReactivatedAccess.data?.data?.id || staffAReactivatedAccess.data?.id;
  assert(staffAReactivatedAccess.ok && reactivatedBizId === businessId, 'Reactivated Staff A recovers business access');

  // -------------------------------------------------------------
  // STEP 8: Owner Reset Password for Staff
  // -------------------------------------------------------------
  console.log('\n🔄 STEP 8: Owner Resets Password for Staff B...');
  const resetPwdRes = await request(`/businesses/${businessId}/members/${staffBMemberId}/reset-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      newPassword: 'StaffBNewTemporaryPassword123!',
    },
  });

  assert(resetPwdRes.ok, 'Owner reset password for Staff B successfully');

  const staffBLoginNew = await request('/auth/login', {
    method: 'POST',
    body: {
      email: staffBEmail,
      password: 'StaffBNewTemporaryPassword123!',
    },
  });

  const staffBNewUserData = extractUser(staffBLoginNew);
  assert(staffBLoginNew.ok && staffBNewUserData?.mustChangePassword === true, 'Staff B logs in with reset password and mustChangePassword = true');

  // -------------------------------------------------------------
  // STEP 9: Safe Owner Protection Guard
  // -------------------------------------------------------------
  console.log('\n🔒 STEP 9: Safe Owner Protection Verification...');
  // Find owner member record ID
  const allMembersRes = await request(`/businesses/${businessId}/members`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const memberList = Array.isArray(allMembersRes.data?.data) ? allMembersRes.data.data : (Array.isArray(allMembersRes.data) ? allMembersRes.data : []);
  const ownerMember = memberList.find((m) => m.role === 'OWNER');
  assert(!!ownerMember?.id, `Owner member record identified (ID: ${ownerMember?.id})`);

  if (ownerMember?.id) {
    const tryModifyOwner = await request(`/businesses/${businessId}/members/${ownerMember.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: 'SUSPENDED' },
    });
    assert(tryModifyOwner.status === 400, 'Attempt to suspend Owner rejected with 400 Bad Request');

    const tryChangeOwnerPerms = await request(`/businesses/${businessId}/members/${ownerMember.id}/permissions`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { permissions: ['ORDER_VIEW'] },
    });
    assert(tryChangeOwnerPerms.status === 400, 'Attempt to modify Owner permissions rejected with 400 Bad Request');
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log(`📊 E2E TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Unhandled E2E Error:', err);
  process.exit(1);
});
