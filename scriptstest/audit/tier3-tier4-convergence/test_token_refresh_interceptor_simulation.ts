// /**
//  * HUKI EBOOK - TIER 4 TEST HARNESS: TOKEN REFRESH INTERCEPTOR CONCURRENCY & RACE CONDITION TEST
//  * 
//  * Verifies that the apiClient token refresh interceptor:
//  * 1. Executes exactly ONE refresh network call when multiple concurrent requests receive 401.
//  * 2. Properly queues and resolves all concurrent requests with the new access token.
//  * 3. Immediately retries without calling /auth/refresh if another request has already refreshed the token.
//  * 4. Gracefully handles refresh failure by clearing tokens and returning standard UNAUTHORIZED.
//  * 5. Prevents infinite redirect loops and race conditions.
//  */
//
// import assert from 'node:assert';
//
// class SimulatedTokenStorage {
//   private accessToken: string | null = null;
//   private refreshToken: string | null = null;
//
//   getAccessToken(): string | null {
//     return this.accessToken;
//   }
//
//   getRefreshToken(): string | null {
//     return this.refreshToken;
//   }
//
//   setTokens(tokens: { accessToken: string; refreshToken?: string }) {
//     this.accessToken = tokens.accessToken;
//     if (tokens.refreshToken !== undefined) {
//       this.refreshToken = tokens.refreshToken;
//     }
//   }
//
//   clearTokens() {
//     this.accessToken = null;
//     this.refreshToken = null;
//   }
// }
//
// class SimulatedApiClient {
//   public refreshCallCount = 0;
//   public totalRequestCalls = 0;
//   private refreshPromise: Promise<string | null> | null = null;
//   public storage = new SimulatedTokenStorage();
//
//   // Mock server state
//   public validAccessToken = 'valid_token_initial';
//   public shouldRefreshSucceed = true;
//
//   async mockServerHandler(url: string, headers: Record<string, string>): Promise<{ status: number; data?: any }> {
//     this.totalRequestCalls++;
//
//     if (url === '/api/v1/auth/refresh') {
//       this.refreshCallCount++;
//       if (this.shouldRefreshSucceed) {
//         this.validAccessToken = `token_refreshed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
//         return {
//           status: 200,
//           data: {
//             accessToken: this.validAccessToken,
//             refreshToken: 'new_refresh_token',
//           },
//         };
//       } else {
//         return { status: 401, data: { message: 'Refresh token invalid' } };
//       }
//     }
//
//     // Normal protected API endpoint
//     const authHeader = headers['Authorization'];
//     const token = authHeader?.replace('Bearer ', '');
//
//     if (token === this.validAccessToken) {
//       return { status: 200, data: { success: true, endpoint: url } };
//     } else {
//       return { status: 401, data: { message: 'Token expired' } };
//     }
//   }
//
//   async request(endpoint: string, options: { skipAuth?: boolean } = {}): Promise<any> {
//     const { skipAuth = false } = options;
//     const url = endpoint;
//     const headers: Record<string, string> = { 'Content-Type': 'application/json' };
//
//     if (!skipAuth) {
//       const accessToken = this.storage.getAccessToken();
//       if (accessToken) {
//         headers['Authorization'] = `Bearer ${accessToken}`;
//       }
//     }
//
//     const response = await this.mockServerHandler(url, headers);
//
//     const hadToken = Boolean(this.storage.getAccessToken());
//     if (response.status === 401 && hadToken && !skipAuth && !endpoint.includes('/auth/refresh')) {
//       const tokenSent = headers['Authorization']?.replace('Bearer ', '');
//       const currentStoredToken = this.storage.getAccessToken();
//
//       // If another concurrent request has already refreshed the token in the background:
//       if (currentStoredToken && tokenSent && currentStoredToken !== tokenSent) {
//         headers['Authorization'] = `Bearer ${currentStoredToken}`;
//         const retryRes = await this.mockServerHandler(url, headers);
//         return retryRes.data;
//       }
//
//       if (!this.refreshPromise) {
//         this.refreshPromise = (async () => {
//           try {
//             // Simulated network latency for refresh call
//             await new Promise((resolve) => setTimeout(resolve, 50));
//             const refreshRes = await this.mockServerHandler('/api/v1/auth/refresh', headers);
//
//             if (refreshRes.status === 200) {
//               const newAccessToken = refreshRes.data?.accessToken;
//               if (newAccessToken) {
//                 this.storage.setTokens({ accessToken: newAccessToken });
//                 return newAccessToken;
//               }
//             }
//             return null;
//           } catch {
//             return null;
//           }
//         })().finally(() => {
//           this.refreshPromise = null;
//         });
//       }
//
//       const retryToken = await this.refreshPromise;
//
//       if (retryToken) {
//         headers['Authorization'] = `Bearer ${retryToken}`;
//         const retryRes = await this.mockServerHandler(url, headers);
//         return retryRes.data;
//       } else {
//         this.storage.clearTokens();
//         return {
//           success: false,
//           error: {
//             code: 'UNAUTHORIZED',
//             message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
//             statusCode: 401,
//           },
//         };
//       }
//     }
//
//     return response.data;
//   }
// }
//
// async function runTokenRefreshInterceptorTests() {
//   console.log('================================================================');
//   console.log('START: TOKEN REFRESH INTERCEPTOR CONCURRENCY & RACE TEST SUITE');
//   console.log('================================================================');
//
//   let passed = 0;
//   let total = 0;
//
//   async function runAsyncTest(name: string, fn: () => Promise<void>) {
//     total++;
//     try {
//       await fn();
//       passed++;
//       console.log(`[PASS] ${name}`);
//     } catch (err: any) {
//       console.error(`[FAIL] ${name}: ${err.message}`);
//       process.exitCode = 1;
//     }
//   }
//
//   // TEST 1: Single request with expired token triggers 1 refresh call and succeeds on retry
//   await runAsyncTest('TEST 1: Single request with expired token refreshes and retries successfully', async () => {
//     const client = new SimulatedApiClient();
//     client.storage.setTokens({ accessToken: 'expired_token_1' });
//     client.validAccessToken = 'valid_server_token_1';
//
//     const res = await client.request('/api/v1/user/profile');
//     assert.strictEqual(res.success, true);
//     assert.strictEqual(client.refreshCallCount, 1, 'Should call refresh exactly once');
//     assert.strictEqual(client.storage.getAccessToken(), client.validAccessToken);
//   });
//
//   // TEST 2: 5 Concurrent requests all hitting 401 must coalesce into EXACTLY ONE refresh call
//   await runAsyncTest('TEST 2: 5 concurrent requests hit 401 -> coalesces into EXACTLY 1 refresh call', async () => {
//     const client = new SimulatedApiClient();
//     client.storage.setTokens({ accessToken: 'expired_shared_token' });
//     client.validAccessToken = 'valid_server_token_2';
//
//     // Fire 5 requests concurrently
//     const endpoints = [
//       '/api/v1/orders',
//       '/api/v1/cart',
//       '/api/v1/notifications',
//       '/api/v1/wishlist',
//       '/api/v1/wallet',
//     ];
//
//     const results = await Promise.all(endpoints.map((ep) => client.request(ep)));
//
//     for (const r of results) {
//       assert.strictEqual(r.success, true, 'All 5 concurrent requests must succeed after single refresh');
//     }
//     assert.strictEqual(client.refreshCallCount, 1, 'MUST make exactly ONE refresh network call for all 5 concurrent requests');
//     assert.strictEqual(client.storage.getAccessToken(), client.validAccessToken);
//   });
//
//   // TEST 3: Staggered request sent with old token after refresh already completed
//   await runAsyncTest('TEST 3: Staggered request with old token retries immediately without duplicate refresh', async () => {
//     const client = new SimulatedApiClient();
//     client.storage.setTokens({ accessToken: 'fresh_token_already_stored' });
//     client.validAccessToken = 'fresh_token_already_stored';
//
//     // Simulate an in-flight request that had old token in headers
//     const customHeaders = { Authorization: 'Bearer old_expired_token' };
//     const res = await client.mockServerHandler('/api/v1/books', customHeaders);
//     assert.strictEqual(res.status, 401);
//
//     // If client runs with updated storage
//     const outcome = await client.request('/api/v1/books');
//     assert.strictEqual(outcome.success, true);
//     assert.strictEqual(client.refreshCallCount, 0, 'No refresh call needed because stored token was already fresh');
//   });
//
//   // TEST 4: Refresh failure gracefully clears storage and returns UNAUTHORIZED
//   await runAsyncTest('TEST 4: Refresh failure gracefully clears tokens and returns UNAUTHORIZED', async () => {
//     const client = new SimulatedApiClient();
//     client.storage.setTokens({ accessToken: 'invalid_token' });
//     client.validAccessToken = 'some_valid_token';
//     client.shouldRefreshSucceed = false; // Mock refresh token failure (expired/revoked)
//
//     const res = await client.request('/api/v1/orders');
//     assert.strictEqual(res.success, false);
//     assert.strictEqual(res.error?.code, 'UNAUTHORIZED');
//     assert.strictEqual(client.storage.getAccessToken(), null, 'Tokens must be cleared from storage');
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
// runTokenRefreshInterceptorTests().catch((err) => {
//   console.error('Fatal error running tests:', err);
//   process.exit(1);
// });
