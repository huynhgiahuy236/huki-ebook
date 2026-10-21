import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class AffiliateMetricsService implements OnModuleInit {
  private readonly register: client.Registry;

  public readonly linkClicksTotal: client.Counter<string>;
  public readonly commissionsCreatedTotal: client.Counter<string>;
  public readonly commissionAmountTotal: client.Counter<string>;
  public readonly commissionsSettledTotal: client.Counter<string>;
  public readonly payoutRequestsTotal: client.Counter<string>;
  public readonly outboxLagGauge: client.Gauge<string>;
  public readonly ledgerReconciliationGauge: client.Gauge<string>;
  public readonly settlementDurationHistogram: client.Histogram<string>;
  public readonly apiLatencyHistogram: client.Histogram<string>;

  constructor() {
    this.register = client.register;

    // Helper to get or create metric safely avoiding duplicate register errors
    const getOrCreateCounter = (config: client.CounterConfiguration<string>) => {
      const existing = this.register.getSingleMetric(config.name);
      if (existing) return existing as client.Counter<string>;
      return new client.Counter({ ...config, registers: [this.register] });
    };

    const getOrCreateGauge = (config: client.GaugeConfiguration<string>) => {
      const existing = this.register.getSingleMetric(config.name);
      if (existing) return existing as client.Gauge<string>;
      return new client.Gauge({ ...config, registers: [this.register] });
    };

    const getOrCreateHistogram = (config: client.HistogramConfiguration<string>) => {
      const existing = this.register.getSingleMetric(config.name);
      if (existing) return existing as client.Histogram<string>;
      return new client.Histogram({ ...config, registers: [this.register] });
    };

    // 1. Link Clicks Total
    this.linkClicksTotal = getOrCreateCounter({
      name: 'huki_affiliate_link_clicks_total',
      help: 'Total affiliate link clicks by store and verification status',
      labelNames: ['store_id', 'status'],
    });

    // 2. Commissions Created Total
    this.commissionsCreatedTotal = getOrCreateCounter({
      name: 'huki_affiliate_commissions_created_total',
      help: 'Total affiliate commissions generated at checkout',
      labelNames: ['store_id', 'status'],
    });

    // 3. Commission Amount Total (VND)
    this.commissionAmountTotal = getOrCreateCounter({
      name: 'huki_affiliate_commission_amount_vnd_total',
      help: 'Accumulated commission amount in VND',
      labelNames: ['store_id'],
    });

    // 4. Commissions Settled Total
    this.commissionsSettledTotal = getOrCreateCounter({
      name: 'huki_affiliate_commissions_settled_total',
      help: 'Total commissions settled by direction (CREDIT to wallet or REVERSAL)',
      labelNames: ['direction'],
    });

    // 5. Payout Requests Total
    this.payoutRequestsTotal = getOrCreateCounter({
      name: 'huki_affiliate_payout_requests_total',
      help: 'Total affiliate payout requests by status',
      labelNames: ['status'],
    });

    // 6. Outbox Lag Gauge
    this.outboxLagGauge = getOrCreateGauge({
      name: 'huki_affiliate_outbox_lag',
      help: 'Count of pending unprocessed outbox events for affiliate subsystem',
    });

    // 7. Ledger Reconciliation Status (1 = balanced, 0 = imbalanced)
    this.ledgerReconciliationGauge = getOrCreateGauge({
      name: 'huki_affiliate_ledger_reconciliation_status',
      help: 'Health of double-entry ledger reconciliation (1 = balanced, 0 = imbalanced)',
    });

    // 8. Settlement Worker Duration Histogram
    this.settlementDurationHistogram = getOrCreateHistogram({
      name: 'huki_affiliate_settlement_duration_seconds',
      help: 'Execution duration of 00:00 UTC+7 settlement batch in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    // 9. API Latency Histogram (target: < 150ms p95 for click/checkout, < 500ms for reporting)
    this.apiLatencyHistogram = getOrCreateHistogram({
      name: 'huki_affiliate_api_latency_seconds',
      help: 'Latency of affiliate API endpoints in seconds',
      labelNames: ['endpoint', 'status_code'],
      buckets: [0.02, 0.05, 0.1, 0.15, 0.25, 0.5, 1, 2],
    });
  }

  onModuleInit() {
    this.ledgerReconciliationGauge.set(1); // Default to balanced on startup
  }

  // --- Convenience Methods ---

  recordClick(storeId: string, status: 'VALID' | 'BOT' | 'INVALID_STORE' | 'RATE_LIMITED' = 'VALID') {
    this.linkClicksTotal.inc({ store_id: storeId, status });
  }

  recordCommissionCreated(storeId: string, amount: number, status: 'PENDING' | 'REJECTED' = 'PENDING') {
    this.commissionsCreatedTotal.inc({ store_id: storeId, status });
    if (status === 'PENDING' && amount > 0) {
      this.commissionAmountTotal.inc({ store_id: storeId }, amount);
    }
  }

  recordSettlement(direction: 'CREDIT' | 'REVERSAL') {
    this.commissionsSettledTotal.inc({ direction });
  }

  recordPayout(status: 'PENDING' | 'COMPLETED' | 'REJECTED') {
    this.payoutRequestsTotal.inc({ status });
  }

  setOutboxLag(lagCount: number) {
    this.outboxLagGauge.set(lagCount);
  }

  setLedgerStatus(isBalanced: boolean) {
    this.ledgerReconciliationGauge.set(isBalanced ? 1 : 0);
  }

  observeSettlementDuration(seconds: number) {
    this.settlementDurationHistogram.observe(seconds);
  }

  observeApiLatency(endpoint: string, statusCode: number, seconds: number) {
    this.apiLatencyHistogram.observe(
      { endpoint, status_code: statusCode.toString() },
      seconds,
    );
  }
}
