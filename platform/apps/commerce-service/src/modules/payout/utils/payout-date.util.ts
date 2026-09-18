/**
 * Centralized Payout Business Day Window Utility
 * Engineering Default Timezone: Asia/Ho_Chi_Minh (UTC+7)
 * Canonical Policy: PENDING / NOT PROVEN
 */
export interface BusinessDayWindow {
  key: string;
  start: Date;
  end: Date;
  timeZone: string;
}

export class PayoutDateUtil {
  public static readonly DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

  /**
   * Calculates the start and end timestamps of the business day containing `date`.
   */
  public static getBusinessDayWindow(
    date: Date = new Date(),
    timeZone: string = PayoutDateUtil.DEFAULT_TIMEZONE,
  ): BusinessDayWindow {
    // Format date in target timezone to obtain YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dayKey = formatter.format(date); // e.g. "2026-09-19"

    // Construct start and end of that calendar day in target timezone
    // Start of day in target timezone:
    const start = new Date(`${dayKey}T00:00:00.000+07:00`);
    const end = new Date(`${dayKey}T23:59:59.999+07:00`);

    return {
      key: dayKey,
      start,
      end,
      timeZone,
    };
  }
}
