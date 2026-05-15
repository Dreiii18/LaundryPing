// Philippine Time (PHT, UTC+8) day arithmetic.
// Used by lifecycle email cron and any other "X days since" gating where
// the user's local calendar day matters more than UTC.

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/**
 * Returns the integer number of PHT calendar days between `createdAtIso` and now.
 * Both timestamps are mapped to a PHT day index (floor of `(utc + offset) / day_ms`)
 * before subtracting, so the result rolls over at PHT midnight regardless of the
 * server's clock-zone.
 *
 * Example: a row created at 23:59 PHT and inspected at 00:01 PHT the next day
 * returns 1, even though only 2 minutes have elapsed.
 */
export function daysSincePh(createdAtIso: string): number {
  const createdPhDay = Math.floor((new Date(createdAtIso).getTime() + PH_OFFSET_MS) / DAY_MS);
  const todayPhDay = Math.floor((Date.now() + PH_OFFSET_MS) / DAY_MS);
  return todayPhDay - createdPhDay;
}
