# PHASE 8: FINANCE & PAYOUTS
## HUKI EBOOK - Escrow, Wallet & Payouts

---

## MỤC TIÊU

Hoàn thiện hệ thống tài chính: escrow, wallet, và rút tiền.

---

## TASKS

### Task 70: 3-Tier Balance Verification
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Verify 3-tier balance system.

**Deliverables:**
```
✓ Balance Tiers:
  1. Pending Balance
     - Recently received payments
     - Not yet settled
     - Usually 3-7 days hold
     
  2. Frozen Balance
     - Under dispute
     - Pending verification
     - Not available for withdrawal
     
  3. Available Balance
     - Settled funds
     - Can be withdrawn
     - = Pending + Available - Frozen
     
✓ Transaction Types:
  - CREDIT: Money in
  - DEBIT: Money out
  - HOLD: Freeze funds
  - RELEASE: Unfreeze funds
  
✓ Balance Calculation:
  available = SUM(credits) - SUM(debits) - frozen
  pending = SUM(pending_credits)
  frozen = SUM(frozen_amounts)
```

**Files cần verify:**
- `commerce-service/src/services/WalletService.ts`
- `commerce-service/src/models/Wallet.ts`

**Database Schema:**
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  pending_balance DECIMAL(15,2) DEFAULT 0,
  frozen_balance DECIMAL(15,2) DEFAULT 0,
  available_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id),
  type VARCHAR(20), -- CREDIT, DEBIT, HOLD, RELEASE
  amount DECIMAL(15,2),
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  reference_type VARCHAR(50), -- ORDER, REFUND, WITHDRAWAL
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Task 71: Double-Entry Ledger Audit
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Verify double-entry accounting system.

**Deliverables:**
```
✓ Double-Entry Principle:
  Every transaction has:
  - Debit entry (receiver)
  - Credit entry (giver)
  - Sum of debits = Sum of credits
  
✓ Account Types:
  - Asset: Wallet balances
  - Liability: User deposits
  - Revenue: Platform fees
  - Expense: Refunds, fees
  
✓ Ledger Entry:
  {
    transaction_id: UUID,
    account: "USER_WALLET" | "PLATFORM_FEE" | "ESCROW",
    entry_type: "DEBIT" | "CREDIT",
    amount: DECIMAL,
    balance_after: DECIMAL
  }
  
✓ Verification:
  - Sum all debits = Sum all credits
  - No orphan entries
  - Balance consistency check
```

**Files cần create:**
- `commerce-service/src/services/LedgerService.ts`
- `commerce-service/src/services/AccountingService.ts`

**Database Schema:**
```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL,
  account VARCHAR(50) NOT NULL,
  entry_type VARCHAR(10) NOT NULL, -- DEBIT, CREDIT
  amount DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transaction_id, account, entry_type)
);

CREATE TABLE account_summaries (
  account VARCHAR(50) PRIMARY KEY,
  total_debits DECIMAL(15,2) DEFAULT 0,
  total_credits DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### Task 72: Platform Commission Verification
**Priority:** P0 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Verify 15% platform commission calculation.

**Deliverables:**
```
✓ Commission Calculation:
  order_total = subtotal + shipping
  platform_fee = order_total * 0.15
  seller_receive = order_total - platform_fee
  
✓ Commission Flow:
  1. Payment received
  2. Hold in escrow
  3. Commission deducted (15%)
  4. Seller receives 85%
  5. Settlement to seller wallet
  
✓ Verification:
  - Commission = order_total * 0.15
  - Seller receive = order_total * 0.85
  - Ledger entries match
```

**Files cần verify/update:**
- `commerce-service/src/services/CommissionService.ts`
- `commerce-service/src/services/SettlementService.ts`

---

### Task 73: Wallet Dashboard UI
**Priority:** P1 | **Effort:** 3 days | **Owner:** Frontend

**Mô tả:**
Implement seller wallet dashboard.

**Deliverables:**
```
✓ Dashboard Components:
  - Balance Overview Card
    - Available balance
    - Pending balance
    - Frozen balance
    - Total
    
  - Recent Transactions List
    - Filter by type, date
    - Show amount, type, date
    - Link to order
    
  - Quick Actions
    - Withdraw button
    - View statement
    - Download report
    
✓ Balance Display:
  - Large number formatting (VND)
  - Color coding (positive/negative)
  - Last updated timestamp
  
✓ API:
  GET /api/wallet
  GET /api/wallet/transactions?page=1&limit=20
```

**Files cần create:**
- `web/src/ui/pages/seller/WalletDashboard.tsx`
- `web/src/ui/components/wallet/BalanceCard.tsx`
- `web/src/ui/components/wallet/TransactionList.tsx`
- `web/src/services/walletApi.ts`

---

### Task 74: Reconciliation Job
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement automated reconciliation.

**Deliverables:**
```
✓ Reconciliation Checks:
  1. Ledger balance = Wallet balance
  2. Sum transactions = Current balance
  3. Pending orders = Pending balance
  4. Frozen disputes = Frozen balance
  
✓ Scheduled Job:
  - Run daily at midnight
  - Run on-demand
  - Alert on discrepancies
  
✓ Discrepancy Handling:
  - Log all discrepancies
  - Auto-heal minor issues
  - Flag major issues for review
  
✓ Reports:
  - Daily reconciliation report
  - Weekly summary
  - Monthly statement
```

**Files cần create:**
- `commerce-service/src/jobs/ReconciliationJob.ts`
- `commerce-service/src/services/FinanceReconciler.ts`

---

### Task 75: PIN Hashing Verification
**Priority:** P0 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Verify PIN security implementation.

**Deliverables:**
```
✓ PIN Security:
  - 6-digit PIN
  - Hashed with bcrypt/argon2
  - Never stored in plain text
  - Rate limited (5 attempts)
  
✓ Hash Verification:
  - Constant-time comparison
  - No timing attacks
  
✓ Implementation:
  ```javascript
  // Hash PIN
  const hash = await bcrypt.hash(pin, 12);
  
  // Verify PIN
  const match = await bcrypt.compare(enteredPin, storedHash);
  ```
```

**Files cần verify:**
- `commerce-service/src/services/PINService.ts`

---

### Task 76: Payout UI Implementation
**Priority:** P1 | **Effort:** 2 days | **Owner:** Frontend

**Mô tả:**
Implement withdrawal request UI.

**Deliverables:**
```
✓ Withdrawal Form:
  - Amount (input, min/max)
  - Available balance display
  - Bank account info
  - PIN verification
  
✓ Validation:
  - Amount <= available balance
  - Amount >= minimum (e.g., 50,000 VND)
  - PIN required
  
✓ Confirmation:
  - Summary modal
  - Final confirmation
  
✓ Status Tracking:
  - PENDING: Under review
  - APPROVED: Processing
  - COMPLETED: Funds sent
  - REJECTED: Failed
  
✓ API:
  POST /api/wallet/withdraw
  {
    amount: 1000000,
    bankAccountId: "uuid",
    pin: "123456"
  }
```

**Files cần create:**
- `web/src/ui/pages/seller/WithdrawPage.tsx`
- `web/src/ui/components/wallet/WithdrawForm.tsx`
- `web/src/ui/components/common/PINInput.tsx`

---

### Task 77: Bank Transfer Integration
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement automated bank transfer.

**Deliverables:**
```
✓ Transfer Process:
  1. Withdrawal approved
  2. Queue for batch processing
  3. Execute bank transfer
  4. Update status
  5. Notify user
  
✓ Bank Integration:
  - Vietcombank API (or similar)
  - Corporate account transfers
  - Batch processing (end of day)
  
✓ Tracking:
  - Provider reference
  - Transfer status
  - Settlement date
  
✓ Error Handling:
  - Failed transfer retry
  - Admin notification
  - Manual intervention option
```

**Files cần create:**
- `commerce-service/src/services/BankTransferService.ts`
- `commerce-service/src/services/PayoutProcessor.ts`

---

### Task 78: Admin Payout Reconciliation
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement admin payout management.

**Deliverables:**
```
✓ Admin Panel:
  - List pending withdrawals
  - Approve/reject with reason
  - Manual adjustment
  - Bulk operations
  
✓ Actions:
  - Approve: Add to batch
  - Reject: Return to wallet + reason
  - Cancel: Return to wallet
  
✓ Audit:
  - Who approved
  - When approved
  - Amount
  - Bank details
```

**Files cần create:**
- `web/src/ui/pages/admin/PayoutPanel.tsx`
- `commerce-service/src/routes/admin/payouts.ts`

---

## DEPENDENCIES

- Task 70 (3-Tier Balance) → Task 71 (Ledger Audit)
- Task 71 (Ledger Audit) → Task 72 (Commission)
- Task 72 (Commission) → Task 74 (Reconciliation)
- Task 75 (PIN Verification) → Task 76 (Payout UI)
- Task 76 (Payout UI) → Task 77 (Bank Transfer)
- Task 77 (Bank Transfer) → Task 78 (Admin Reconcile)

---

## SUCCESS CRITERIA

- [ ] 3-tier balance displays correctly
- [ ] Double-entry ledger balances
- [ ] Platform commission = 15%
- [ ] Wallet dashboard shows all balances
- [ ] Reconciliation job runs without errors
- [ ] PIN is securely hashed
- [ ] Payout form works
- [ ] Bank transfer processes
- [ ] Admin can manage payouts

---

## TEST CASES

```
TC_ESCROW_01: 3-tier balance correct
TC_ESCROW_02: Commission calculated (15%)
TC_ESCROW_03: Double-entry balanced
TC_ESCROW_04: Dispute freeze works
TC_PAYOUT_01: Correct PIN allows payout
TC_PAYOUT_02: Wrong PIN blocked
TC_PAYOUT_03: 5 attempts = 24h lock
TC_PAYOUT_04: Admin reconciliation
```

---

## NOTES

- All financial operations must be auditable
- Consider implementing monthly statements
- Payout batch processing saves fees
- Keep all transaction history indefinitely
- Consider implementing instant payout option (premium feature)
- Bank transfer should handle holidays/weekends
- Document all edge cases in finance runbook
