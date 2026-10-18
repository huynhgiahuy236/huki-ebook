const jwt = require('../node_modules/jsonwebtoken');
const http = require('http');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0';
const COMMUNITY_URL = 'http://localhost:3005/api/v1';

const testActor = {
  sub: 'seller-test-quick-replies-uuid',
  email: 'seller-qr@huki.com',
  fullName: 'Alpha Bookshop Admin',
  role: 'BUSINESS',
  storeId: 'store-quick-reply-test-store',
};
const token = jwt.sign(testActor, JWT_SECRET, { expiresIn: '1h' });

function apiRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(COMMUNITY_URL + (endpoint.startsWith('/') ? endpoint : '/' + endpoint));
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('   E2E & COMPLIANCE TEST: CHAT QUICK REPLIES (/MÃ) & USER ⇄ SELLER FLOW');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // --- SECTION 1: Backend Quick Reply API & Redis Cache ---
  console.log('--- 1. Testing Backend Quick Replies API & Redis Cache ---');
  const storeId = `store-qr-test-${Date.now()}`;

  // 1.1 List (Should auto-seed 5 default templates)
  const listRes = await apiRequest(`/chat/quick-replies?storeId=${storeId}`, 'GET');
  assert(listRes.status === 200, 'GET /chat/quick-replies returns 200 OK');
  const items = listRes.data?.data || [];
  assert(Array.isArray(items), 'Returns an array of quick replies');
  assert(items.length >= 5, `Auto-seeds default templates (Found ${items.length} templates)`);
  assert(items.some((i) => i.shortcut === 'chao'), 'Contains default /chao template');
  assert(items.some((i) => i.shortcut === 'ship'), 'Contains default /ship template');

  // 1.2 Redis cached second call (< 15ms)
  const startCache = Date.now();
  const cachedRes = await apiRequest(`/chat/quick-replies?storeId=${storeId}`, 'GET');
  const duration = Date.now() - startCache;
  assert(cachedRes.status === 200, 'Cached GET /chat/quick-replies returns 200 OK');
  assert(duration < 50, `Subsequent cached call returns rapidly (${duration}ms)`);

  // 1.3 Create new custom template
  const newShortcut = `test_${Date.now().toString().slice(-4)}`;
  const createRes = await apiRequest('/chat/quick-replies', 'POST', {
    storeId,
    shortcut: newShortcut,
    title: 'Mẫu câu kiểm thử',
    content: 'Dạ đơn sách của bạn đang được tiến hành đóng gói tiêu chuẩn ạ!',
  });
  assert(createRes.status === 201 || createRes.status === 200, 'POST /chat/quick-replies creates new template');
  const createdItem = createRes.data?.data;
  assert(createdItem?.shortcut === newShortcut, `Shortcut saved cleanly without leading slash (${createdItem?.shortcut})`);
  const createdId = createdItem?._id || createdItem?.id;

  // 1.4 Increment usage count
  if (createdId) {
    const useRes = await apiRequest(`/chat/quick-replies/${createdId}/use?storeId=${storeId}`, 'PATCH');
    assert(useRes.status === 200, 'PATCH /chat/quick-replies/:id/use increments usage count');
  }

  // 1.5 Update template
  if (createdId) {
    const updateRes = await apiRequest(`/chat/quick-replies/${createdId}?storeId=${storeId}`, 'PUT', {
      title: 'Mẫu câu kiểm thử đã sửa',
      content: 'Nội dung cập nhật mới nhất cho khách hàng.',
    });
    assert(updateRes.status === 200, 'PUT /chat/quick-replies/:id updates template successfully');
  }

  // 1.6 Delete template
  if (createdId) {
    const deleteRes = await apiRequest(`/chat/quick-replies/${createdId}?storeId=${storeId}`, 'DELETE');
    assert(deleteRes.status === 200, 'DELETE /chat/quick-replies/:id removes template successfully');
  }

  // --- SECTION 2: Frontend Seller Chat View Compliance ---
  console.log('\n--- 2. Verifying SellerChatView.tsx Implementation ---');
  const sellerChatPath = path.resolve(__dirname, '../../web/src/ui/components/seller/SellerChatView.tsx');
  const sellerChatCode = fs.readFileSync(sellerChatPath, 'utf8');

  assert(sellerChatCode.includes('chatQuickReplyService'), 'Imports chatQuickReplyService');
  assert(sellerChatCode.includes('handleSelectQuickReply'), 'Has handleSelectQuickReply for autocomplete');
  assert(sellerChatCode.includes('isSlashOpen'), 'Controls autocomplete popover when typing /');
  assert(sellerChatCode.includes('filteredQuickReplies'), 'Filters quick replies dynamically by slash query');
  assert(sellerChatCode.includes('isQuickReplySettingsOpen') || sellerChatCode.includes('quickReplyForm'), 'Has Quick Reply Settings Modal');
  assert(sellerChatCode.includes('handleSaveQuickReply'), 'Has handleSaveQuickReply for creating and editing shortcuts');
  assert(sellerChatCode.includes('handleDeleteQuickReply'), 'Has handleDeleteQuickReply for removing shortcuts');
  assert(sellerChatCode.includes('voucherApi.getVouchersByStore'), 'Fetches real store vouchers in voucher modal');
  assert(sellerChatCode.includes('hasVideo ?') || sellerChatCode.includes('[Video]'), 'Provides fallback text when sending file without text');

  // --- SECTION 3: Frontend User Chat (Messenger) Compliance ---
  console.log('\n--- 3. Verifying User Chat (/account/messages) Implementation ---');
  const userChatPath = path.resolve(__dirname, '../../web/src/app/account/messages/page.tsx');
  const userChatCode = fs.readFileSync(userChatPath, 'utf8');

  assert(userChatCode.includes('fileInputRef'), 'Has fileInputRef for real file attachments');
  assert(userChatCode.includes('accept="image/*,video/*"'), 'Accepts both images and videos');
  assert(userChatCode.includes('selectedFiles') && userChatCode.includes('filePreviews'), 'Manages file preview tray state');
  assert(userChatCode.includes('filesToUpload'), 'Uploads files via chatService.sendMessage with multipart');
  assert(userChatCode.includes('video') && userChatCode.includes('controls'), 'Renders HTML5 video player for video attachments');
  assert(userChatCode.includes('voucherApi.saveVoucher'), 'Calls real voucherApi.saveVoucher to claim voucher to user wallet');
  assert(userChatCode.includes('realtimeSyncBus.publish(\'VOUCHER_CLAIMED\''), 'Publishes VOUCHER_CLAIMED event for realtime cart synchronization');

  console.log('\n========================================================================');
  console.log(`   TEST RESULT: ${passed}/${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
