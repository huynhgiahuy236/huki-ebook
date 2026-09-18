# PHASE 9: ANALYTICS & MODERATION
## HUKI EBOOK - Business Intelligence & Platform Moderation

---

## MỤC TIÊU

Xây dựng hệ thống analytics và moderation cho platform.

---

## TASKS

### Task 79: Build Analytics Service
**Priority:** P0 | **Effort:** 4 days | **Owner:** Backend

**Mô tả:**
Build analytics service từ đầu.

**Deliverables:**
```
✓ Analytics Architecture:
  - Dedicated analytics service
  - Event-driven data collection
  - Real-time and batch processing
  - Data warehouse design
  
✓ Event Collection:
  - Page views
  - Product views
  - Add to cart
  - Checkout
  - Payment
  - Search queries
  
✓ Event Schema:
  {
    event_id: UUID,
    event_type: STRING,
    user_id: UUID,
    session_id: UUID,
    timestamp: TIMESTAMP,
    properties: JSONB,
    context: {
      ip: STRING,
      user_agent: STRING,
      referrer: STRING
    }
  }
  
✓ Processing:
  - Real-time: Stream to dashboard
  - Batch: Daily/hourly aggregations
  - Ad-hoc: Query raw events
  
✓ Technology:
  - ClickHouse or TimescaleDB
  - Or: PostgreSQL with partitioning
  - Or: Separate analytics DB
```

**Files cần create:**
- `analytics-service/src/services/EventCollector.ts`
- `analytics-service/src/services/EventProcessor.ts`
- `analytics-service/src/models/Event.ts`
- `analytics-service/src/routes/events.ts`

**Database Schema:**
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id UUID,
  session_id UUID,
  properties JSONB,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_aggregates (
  date DATE,
  event_type VARCHAR(100),
  metric_name VARCHAR(100),
  metric_value DECIMAL(15,2),
  dimensions JSONB,
  PRIMARY KEY (date, event_type, metric_name)
);
```

---

### Task 80: GMV Calculation
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement GMV (Gross Merchandise Value) calculation.

**Deliverables:**
```
✓ GMV Definition:
  GMV = SUM(order_total) for successful orders
  
✓ GMV Metrics:
  - Total GMV (all time)
  - Daily GMV
  - Weekly GMV
  - Monthly GMV
  - GMV by category
  - GMV by store
  - GMV by seller
  
✓ Calculation:
  ```
  gmv = orders
    .where(status IN ['COMPLETED', 'DELIVERED'])
    .where(payment_status = 'SUCCEEDED')
    .sum(total)
  ```
  
✓ Real-time Updates:
  - Update on payment success
  - Cache in Redis
  - Refresh periodically
  
✓ API:
  GET /api/analytics/gmv
  {
    total: 1000000000,
    daily: { date: "2026-09-16", amount: 50000000 },
    weekly: { start: "...", amount: 300000000 }
  }
```

**Files cần create:**
- `analytics-service/src/services/GMVService.ts`
- `analytics-service/src/routes/analytics.ts`

---

### Task 81: GMV Dashboard UI
**Priority:** P0 | **Effort:** 3 days | **Owner:** Frontend

**Mô tả:**
Implement GMV dashboard cho admin.

**Deliverables:**
```
✓ Dashboard Components:
  - KPI Cards:
    - Total GMV
    - Orders count
    - Average order value
    - Growth % (vs last period)
    
  - Charts:
    - GMV over time (line chart)
    - GMV by category (bar chart)
    - Top sellers (table)
    - Top products (table)
    
  - Filters:
    - Date range
    - Category
    - Store/Seller
    - Region
    
✓ Real-time:
  - Update every 5 minutes
  - Live indicator
  
✓ Export:
  - Download CSV
  - Download PDF report
```

**Files cần create:**
- `web/src/ui/pages/admin/AnalyticsDashboard.tsx`
- `web/src/ui/components/analytics/GMVChart.tsx`
- `web/src/ui/components/analytics/KPICard.tsx`
- `web/src/ui/components/analytics/TopSellersTable.tsx`
- `web/src/services/analyticsApi.ts`

---

### Task 82: Daily Rollup Cron Job
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement daily aggregation job.

**Deliverables:**
```
✓ Daily Rollup:
  - Run at 00:05 every day
  - Aggregate previous day's events
  - Store in daily_aggregates table
  - Update materialized views
  
✓ Metrics Aggregated:
  - Page views
  - Unique visitors
  - Orders
  - GMV
  - New users
  - New sellers
  - Products added
  - Reviews posted
  
✓ Retention:
  - Raw events: 90 days
  - Daily aggregates: 2 years
  - Monthly aggregates: Forever
```

**Files cần create:**
- `analytics-service/src/jobs/DailyRollupJob.ts`

---

### Task 83: Sanction Enforcement Logic
**Priority:** P1 | **Effort:** 3 days | **Owner:** Backend

**Mô tả:**
Implement platform sanction system.

**Deliverables:**
```
✓ Sanction Levels:
  1. Warning (1 week)
     - Seller receives warning
     - Can still operate
     - Monitor closely
     
  2. Probation (1 month)
     - New orders on hold
     - Reduced visibility
     - Must resolve issues
     
  3. Suspension (1-3 months)
     - Cannot list new products
     - Cannot receive orders
     - Existing orders fulfilled
     
  4. Permanent Ban
     - Account terminated
     - All data retained
     - Legal referral if needed
     
✓ Trigger Conditions:
  - Fake reviews detected
  - Counterfeit products
  - Intellectual property violation
  - Fraud
  - Repeated policy violations
  
✓ Enforcement:
  - Disable seller login (optional)
  - Hide products from search
  - Cancel pending orders
  - Freeze wallet
  - Send notification
  
✓ Appeal:
  - Seller can appeal within 7 days
  - Appeal reviewed within 48 hours
  - Lift sanction if valid
```

**Files cần create:**
- `commerce-service/src/services/SanctionService.ts`
- `commerce-service/src/services/AppealService.ts`
- `commerce-service/src/models/Sanction.ts`

**Database Schema:**
```sql
CREATE TABLE sanctions (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id),
  level VARCHAR(20) NOT NULL, -- WARNING, PROBATION, SUSPENSION, BAN
  reason VARCHAR(255) NOT NULL,
  evidence JSONB,
  issued_by UUID,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, APPEALED, EXPIRED, LIFTED
  appeal_id UUID
);

CREATE TABLE sanction_appeals (
  id UUID PRIMARY KEY,
  sanction_id UUID REFERENCES sanctions(id),
  seller_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  decision VARCHAR(20), -- UPHELD, LIFTED
  decision_reason TEXT
);
```

---

### Task 84: Appeal Workflow
**Priority:** P2 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement seller appeal workflow.

**Deliverables:**
```
✓ Appeal Submission:
  - Seller sees sanction
  - Click "Appeal"
  - Submit reason
  - Upload evidence
  - Submit
  
✓ Appeal Review:
  - Admin sees pending appeals
  - Reviews evidence
  - Makes decision
  - Adds notes
  
✓ Decision:
  - UPHELD: Sanction continues
  - LIFTED: Sanction removed
  
✓ Notifications:
  - Appeal submitted → Seller
  - Appeal decided → Seller + Admin
```

**Files cần create:**
- `web/src/ui/pages/seller/AppealPage.tsx`
- `web/src/ui/pages/admin/AppealReviewPanel.tsx`
- `commerce-service/src/routes/seller/appeals.ts`
- `commerce-service/src/routes/admin/appeals.ts`

---

## DEPENDENCIES

- Task 79 (Analytics Service) → Task 80 (GMV)
- Task 80 (GMV) → Task 81 (Dashboard)
- Task 79 (Analytics Service) → Task 82 (Rollup)
- Task 83 (Sanction) → Task 84 (Appeal)

---

## SUCCESS CRITERIA

- [ ] Analytics events collected
- [ ] GMV calculated correctly
- [ ] Dashboard displays data
- [ ] Daily rollup job runs
- [ ] Sanctions can be applied
- [ ] Seller can appeal sanctions
- [ ] Admin can review appeals

---

## TEST CASES

```
TC_ANALYTICS_01: GMV calculation correct
TC_ANALYTICS_02: Dashboard displays data
TC_ANALYTICS_03: Rollup job aggregates correctly
TC_SANCTION_01: Suspend store works
TC_SANCTION_02: Appeal workflow
TC_SANCTION_03: Lift sanction on appeal win
```

---

## NOTES

- Analytics data grows quickly - plan storage
- Consider data anonymization for privacy
- Dashboard should load fast (cache aggregated data)
- GMV should match payment records
- Sanctions need legal review
- Appeal process should be fair and transparent
- Consider implementing audit trail for all admin actions
