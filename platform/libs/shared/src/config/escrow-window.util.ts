/**
 * Single source of truth for escrow hold window duration across Seller & Affiliate modules.
 * When `ESCROW_HOLD_DURATION_SECONDS` is set (> 0, e.g. 180 for UAT 3-minute cycle),
 * both Seller settlement and Affiliate holding durations synchronize automatically.
 * Otherwise falls back to Production policy values (e.g. 7 days / 24 hours).
 */
export function getConfiguredEscrowHoldSeconds(): number | null {
  const raw = Number(process.env.ESCROW_HOLD_DURATION_SECONDS);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return null;
}

export function resolveEscrowHoldMs(fallbackMs: number): number {
  const configuredSec = getConfiguredEscrowHoldSeconds();
  return configuredSec !== null ? configuredSec * 1000 : fallbackMs;
}

export function resolveEscrowHoldHours(fallbackHours: number): number {
  const configuredSec = getConfiguredEscrowHoldSeconds();
  return configuredSec !== null ? configuredSec / 3600 : fallbackHours;
}
