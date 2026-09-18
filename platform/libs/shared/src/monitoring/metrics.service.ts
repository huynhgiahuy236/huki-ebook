import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

// Initialize the default registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

@Injectable()
export class MetricsService implements OnModuleInit {
  private register: client.Registry;

  // HTTP metrics
  private httpRequestDuration: client.Histogram<string>;
  private httpRequestTotal: client.Counter<string>;

  // Business metrics
  private ordersCreated: client.Counter<string>;
  private paymentsSucceeded: client.Counter<string>;
  private paymentsFailed: client.Counter<string>;
  private inventoryOperations: client.Counter<string>;
  private cartOperations: client.Counter<string>;
  private searchOperations: client.Counter<string>;

  constructor() {
    this.register = register;

    // HTTP Request Duration
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    // HTTP Request Total
    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // Orders Created
    this.ordersCreated = new client.Counter({
      name: 'huki_orders_created_total',
      help: 'Total number of orders created',
      labelNames: ['status'],
      registers: [this.register],
    });

    // Payments Succeeded
    this.paymentsSucceeded = new client.Counter({
      name: 'huki_payments_succeeded_total',
      help: 'Total number of successful payments',
      labelNames: ['payment_method'],
      registers: [this.register],
    });

    // Payments Failed
    this.paymentsFailed = new client.Counter({
      name: 'huki_payments_failed_total',
      help: 'Total number of failed payments',
      labelNames: ['reason'],
      registers: [this.register],
    });

    // Inventory Operations
    this.inventoryOperations = new client.Counter({
      name: 'huki_inventory_operations_total',
      help: 'Total number of inventory operations',
      labelNames: ['operation', 'status'],
      registers: [this.register],
    });

    // Cart Operations
    this.cartOperations = new client.Counter({
      name: 'huki_cart_operations_total',
      help: 'Total number of cart operations',
      labelNames: ['operation'],
      registers: [this.register],
    });

    // Search Operations
    this.searchOperations = new client.Counter({
      name: 'huki_search_operations_total',
      help: 'Total number of search operations',
      labelNames: ['type', 'status'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    console.log('📊 Shared Metrics service initialized');
  }

  getRegister(): client.Registry {
    return this.register;
  }

  // HTTP metrics methods
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const labels = {
      method,
      route: this.normalizeRoute(route),
      status_code: statusCode.toString(),
    };
    this.httpRequestDuration.observe(labels, durationSeconds);
    this.httpRequestTotal.inc(labels);
  }

  // Order metrics
  recordOrderCreated(status: 'success' | 'failed') {
    this.ordersCreated.inc({ status });
  }

  // Payment metrics
  recordPaymentSucceeded(paymentMethod: string) {
    this.paymentsSucceeded.inc({ payment_method: paymentMethod });
  }

  recordPaymentFailed(reason: string) {
    this.paymentsFailed.inc({ reason });
  }

  // Inventory metrics
  recordInventoryOperation(
    operation: 'reserve' | 'release' | 'deduct' | 'restock',
    status: 'success' | 'failed',
  ) {
    this.inventoryOperations.inc({ operation, status });
  }

  // Cart metrics
  recordCartOperation(operation: 'add' | 'remove' | 'update' | 'clear') {
    this.cartOperations.inc({ operation });
  }

  // Search metrics
  recordSearch(type: 'fulltext' | 'filter' | 'browse', status: 'success' | 'failed') {
    this.searchOperations.inc({ type, status });
  }

  // Helper: Normalize route for metrics
  private normalizeRoute(path: string): string {
    // Replace UUIDs with :id
    return path
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      // Replace numeric IDs with :id
      .replace(/\/\d+/g, '/:id')
      // Normalize trailing slashes
      .replace(/\/+$/, '')
      || '/';
  }
}
