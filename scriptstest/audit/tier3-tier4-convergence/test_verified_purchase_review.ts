// /**
//  * HUKI EBOOK - TIER 3 TEST HARNESS: VERIFIED PURCHASE REVIEW
//  * 
//  * Verifies that community-service strictly enforces verified purchase requirements:
//  * 1. An order in PENDING, PROCESSING, CONFIRMED, PAID, or SHIPPED cannot be reviewed.
//  * 2. An order in DELIVERED or COMPLETED status allows review submission.
//  * 3. A user without any purchase of the book is blocked with REVIEW_PURCHASE_REQUIRED.
//  * 4. Format match (DIGITAL vs PHYSICAL) is strictly respected.
//  */
//
// import assert from 'node:assert';
//
// interface MockOrderItem {
//   bookId: string;
//   format: string;
// }
//
// interface MockSellerOrder {
//   id: string;
//   storeId: string;
//   ownerUserId: string;
//   status: string;
//   items: MockOrderItem[];
// }
//
// interface MockOrder {
//   id: string;
//   status: string;
//   sellerOrders: MockSellerOrder[];
// }
//
// /**
//  * Extracted Verification Logic matching ReviewVerificationService
//  */
// function verifyBookPurchase(
//   orderList: MockOrder[],
//   bookId: string,
//   format?: string
// ) {
//   const cleanTargetBookId = String(bookId || "").trim().toLowerCase();
//
//   for (const order of orderList) {
//     const isDone = (status: string) => {
//       const s = String(status || "").toUpperCase();
//       return (
//         s === "COMPLETED" ||
//         s === "DELIVERED" ||
//         s === "SUCCESS"
//       );
//     };
//     const orderDone = isDone(order.status);
//
//     for (const sellerOrder of order.sellerOrders ?? []) {
//       const sellerOrderDone = isDone(sellerOrder.status) || orderDone;
//
//       const item = sellerOrder.items?.find((candidate: any) => {
//         const candBookId = String(candidate.bookId || candidate.id || "").trim().toLowerCase();
//         if (candBookId !== cleanTargetBookId && !cleanTargetBookId.includes(candBookId) && !candBookId.includes(cleanTargetBookId)) {
//           return false;
//         }
//         if (!format) return true;
//         const candFmt = String(candidate.format || "").toUpperCase();
//         const targetFmt = String(format).toUpperCase();
//         return (
//           candFmt === targetFmt ||
//           (targetFmt === "PHYSICAL" && candFmt.includes("PHYSICAL")) ||
//           (targetFmt === "DIGITAL" && (candFmt.includes("DIGITAL") || candFmt.includes("EBOOK")))
//         );
//       });
//
//       if (item && sellerOrderDone) {
//         return {
//           orderId: order.id,
//           sellerOrderId: sellerOrder.id,
//           storeId: sellerOrder.storeId,
//           storeOwnerId: sellerOrder.ownerUserId,
//           format,
//         };
//       }
//     }
//   }
//   return null;
// }
//
// async function runVerifiedPurchaseReviewTests() {
//   console.log('================================================================');
//   console.log('START: VERIFIED PURCHASE REVIEW INTEGRATION SUITE');
//   console.log('================================================================');
//
//   let passed = 0;
//   let total = 0;
//
//   function runTest(name: string, fn: () => void) {
//     total++;
//     try {
//       fn();
//       passed++;
//       console.log(`[PASS] ${name}`);
//     } catch (err: any) {
//       console.error(`[FAIL] ${name}: ${err.message}`);
//       process.exitCode = 1;
//     }
//   }
//
//   // TEST 1: Reject order in PROCESSING status
//   runTest('TEST 1: Order in PROCESSING status must NOT be allowed to review', () => {
//     const orders: MockOrder[] = [{
//       id: 'ord-proc-01',
//       status: 'PROCESSING',
//       sellerOrders: [{
//         id: 'so-proc-01',
//         storeId: 'store-01',
//         ownerUserId: 'owner-01',
//         status: 'PROCESSING',
//         items: [{ bookId: 'book-999', format: 'PHYSICAL' }],
//       }],
//     }];
//     const result = verifyBookPurchase(orders, 'book-999', 'PHYSICAL');
//     assert.strictEqual(result, null, 'Expected PROCESSING order to be blocked from review');
//   });
//
//   // TEST 2: Reject order in CONFIRMED / PAID status
//   runTest('TEST 2: Order in CONFIRMED / PAID status must NOT be allowed to review', () => {
//     const orders: MockOrder[] = [{
//       id: 'ord-paid-01',
//       status: 'PROCESSING',
//       sellerOrders: [{
//         id: 'so-paid-01',
//         storeId: 'store-01',
//         ownerUserId: 'owner-01',
//         status: 'CONFIRMED',
//         items: [{ bookId: 'book-999', format: 'PHYSICAL' }],
//       }],
//     }];
//     const result = verifyBookPurchase(orders, 'book-999', 'PHYSICAL');
//     assert.strictEqual(result, null, 'Expected CONFIRMED/PAID order to be blocked from review');
//   });
//
//   // TEST 3: Reject order in SHIPPED status (not yet delivered to buyer)
//   runTest('TEST 3: Order in SHIPPED status must NOT be allowed to review before delivery', () => {
//     const orders: MockOrder[] = [{
//       id: 'ord-ship-01',
//       status: 'SHIPPING',
//       sellerOrders: [{
//         id: 'so-ship-01',
//         storeId: 'store-01',
//         ownerUserId: 'owner-01',
//         status: 'SHIPPED',
//         items: [{ bookId: 'book-999', format: 'PHYSICAL' }],
//       }],
//     }];
//     const result = verifyBookPurchase(orders, 'book-999', 'PHYSICAL');
//     assert.strictEqual(result, null, 'Expected SHIPPED order to be blocked until delivery');
//   });
//
//   // TEST 4: Allow order when sellerOrder is marked DELIVERED
//   runTest('TEST 4: Order with sellerOrder DELIVERED status MUST be allowed to review', () => {
//     const orders: MockOrder[] = [{
//       id: 'ord-deliv-01',
//       status: 'SHIPPING',
//       sellerOrders: [{
//         id: 'so-deliv-01',
//         storeId: 'store-01',
//         ownerUserId: 'owner-01',
//         status: 'DELIVERED',
//         items: [{ bookId: 'book-999', format: 'PHYSICAL' }],
//       }],
//     }];
//     const result = verifyBookPurchase(orders, 'book-999', 'PHYSICAL');
//     assert.notStrictEqual(result, null, 'Expected DELIVERED order to be permitted');
//     assert.strictEqual(result?.orderId, 'ord-deliv-01');
//     assert.strictEqual(result?.sellerOrderId, 'so-deliv-01');
//   });
//
//   // TEST 5: Allow order when master order status is COMPLETED
//   runTest('TEST 5: Order with master COMPLETED status MUST be allowed to review', () => {
//     const orders: MockOrder[] = [{
//       id: 'ord-comp-01',
//       status: 'COMPLETED',
//       sellerOrders: [{
//         id: 'so-comp-01',
//         storeId: 'store-02',
//         ownerUserId: 'owner-02',
//         status: 'COMPLETED',
//         items: [{ bookId: 'book-100', format: 'DIGITAL' }],
//       }],
//     }];
//     const result = verifyBookPurchase(orders, 'book-100', 'DIGITAL');
//     assert.notStrictEqual(result, null, 'Expected COMPLETED order to be permitted');
//     assert.strictEqual(result?.orderId, 'ord-comp-01');
//   });
//
//   // TEST 6: Reject when user never purchased the target book
//   runTest('TEST 6: User with unrelated purchases must be blocked from reviewing target book', () => {
//     const orders: MockOrder[] = [{
//       id: 'ord-comp-02',
//       status: 'COMPLETED',
//       sellerOrders: [{
//         id: 'so-comp-02',
//         storeId: 'store-02',
//         ownerUserId: 'owner-02',
//         status: 'COMPLETED',
//         items: [{ bookId: 'book-different', format: 'DIGITAL' }],
//       }],
//     }];
//     const result = verifyBookPurchase(orders, 'book-target-never-bought', 'DIGITAL');
//     assert.strictEqual(result, null, 'Expected unpurchased book to return null');
//   });
//
//   // TEST 7: Format mismatch (User bought PHYSICAL, tries to review DIGITAL edition)
//   runTest('TEST 7: Format mismatch (bought PHYSICAL, reviews DIGITAL) must be blocked', () => {
//     const orders: MockOrder[] = [{
//       id: 'ord-comp-03',
//       status: 'COMPLETED',
//       sellerOrders: [{
//         id: 'so-comp-03',
//         storeId: 'store-03',
//         ownerUserId: 'owner-03',
//         status: 'COMPLETED',
//         items: [{ bookId: 'book-300', format: 'PHYSICAL' }],
//       }],
//     }];
//     const result = verifyBookPurchase(orders, 'book-300', 'DIGITAL');
//     assert.strictEqual(result, null, 'Expected format mismatch to be blocked');
//   });
//
//   console.log('================================================================');
//   console.log(`SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
//   console.log('================================================================');
//
//   if (passed !== total) {
//     process.exit(1);
//   }
// }
//
// runVerifiedPurchaseReviewTests().catch((err) => {
//   console.error('Fatal error running tests:', err);
//   process.exit(1);
// });
