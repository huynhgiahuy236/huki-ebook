import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AffiliateStructuredLogger } from './affiliate-structured-logger';

export type AlertSeverity = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM';

export interface AlertPayload {
  title: string;
  severity: AlertSeverity;
  alertType:
    | 'LEDGER_IMBALANCE_DETECTED'
    | 'OUTBOX_QUEUE_BACKLOG'
    | 'SETTLEMENT_WORKER_CRASH'
    | 'FRAUD_SPIKE_DETECTED'
    | 'HIGH_LATENCY_SLO_BREACH';
  message: string;
  metadata?: Record<string, any>;
  runbookUrl?: string;
}

@Injectable()
export class AffiliateAlertService {
  private readonly structuredLogger = new AffiliateStructuredLogger(AffiliateAlertService.name);
  private readonly webhookUrl: string | null;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl =
      this.configService.get<string>('AFFILIATE_ALERT_WEBHOOK_URL') ||
      process.env.AFFILIATE_ALERT_WEBHOOK_URL ||
      null;
  }

  /**
   * Dispatch an operational alert (Structured Log + Webhook)
   */
  async sendAlert(alert: AlertPayload): Promise<{ delivered: boolean; channel: string }> {
    const sanitizedMetadata = AffiliateStructuredLogger.maskPii(alert.metadata || {});

    // 1. Structured log emission
    const logData = {
      action: `ALERT_${alert.severity}_${alert.alertType}`,
      metadata: {
        title: alert.title,
        severity: alert.severity,
        alertType: alert.alertType,
        message: alert.message,
        runbookUrl: alert.runbookUrl || 'https://wiki.huki.vn/ops/runbooks/affiliate',
        ...sanitizedMetadata,
      },
    };

    if (alert.severity === 'P1_CRITICAL') {
      this.structuredLogger.error({
        ...logData,
        error: { message: alert.message },
      });
    } else {
      this.structuredLogger.warn(logData);
    }

    // 2. Webhook notification (Slack/Discord/Telegram compatible)
    if (this.webhookUrl) {
      try {
        const webhookBody = {
          text: `🚨 [${alert.severity}] ${alert.title}\n*Type:* ${alert.alertType}\n*Detail:* ${alert.message}\n*Runbook:* ${alert.runbookUrl || 'N/A'}`,
          attachments: [
            {
              color: alert.severity === 'P1_CRITICAL' ? '#FF0000' : '#FFA500',
              fields: Object.entries(sanitizedMetadata).map(([k, v]) => ({
                title: k,
                value: typeof v === 'object' ? JSON.stringify(v) : String(v),
                short: true,
              })),
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        };

        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookBody),
        });

        return {
          delivered: response.ok,
          channel: 'WEBHOOK',
        };
      } catch (err: any) {
        this.structuredLogger.error({
          action: 'ALERT_WEBHOOK_DISPATCH_FAILED',
          error: { message: err?.message || 'Failed to dispatch webhook alert' },
        });
        return { delivered: false, channel: 'WEBHOOK_FAILED' };
      }
    }

    return { delivered: true, channel: 'STRUCTURED_LOG_ONLY' };
  }

  // --- Predefined Convenience Triggers ---

  async notifyLedgerImbalance(totalBalanceDiff: number, details: Record<string, any>) {
    return this.sendAlert({
      title: 'Double-entry General Ledger Imbalance Detected!',
      severity: 'P1_CRITICAL',
      alertType: 'LEDGER_IMBALANCE_DETECTED',
      message: `Ledger reconciliation found discrepancy of ${totalBalanceDiff.toLocaleString('vi-VN')} VND between Wallets and Ledger entries.`,
      metadata: details,
      runbookUrl: 'https://wiki.huki.vn/ops/runbooks/affiliate-ledger-reconciliation',
    });
  }

  async notifyOutboxBacklog(backlogCount: number) {
    const isP1 = backlogCount >= 1000;
    return this.sendAlert({
      title: `Affiliate Outbox Queue Backlog Exceeded Threshold (${backlogCount} events)`,
      severity: isP1 ? 'P1_CRITICAL' : 'P2_HIGH',
      alertType: 'OUTBOX_QUEUE_BACKLOG',
      message: `Outbox event processor lag is currently ${backlogCount} events (Threshold: ${isP1 ? '>= 1000' : '>= 200'}).`,
      metadata: { backlogCount, isP1 },
      runbookUrl: 'https://wiki.huki.vn/ops/runbooks/affiliate-outbox-lag',
    });
  }

  async notifySettlementWorkerCrash(error: any) {
    return this.sendAlert({
      title: 'Affiliate Daily 00:00 Settlement Worker Crashed!',
      severity: 'P1_CRITICAL',
      alertType: 'SETTLEMENT_WORKER_CRASH',
      message: `Scheduled commission settlement batch encountered unhandled exception: ${error?.message || error}`,
      metadata: { errorName: error?.name, stack: error?.stack },
      runbookUrl: 'https://wiki.huki.vn/ops/runbooks/affiliate-settlement-worker',
    });
  }
}
