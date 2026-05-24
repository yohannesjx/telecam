/** Convert display amount (e.g. "1200.50") to minor units without float drift. */
export function toMinorUnits(amount: string | number): number {
  if (typeof amount === "number") {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.round(amount * 100);
  }
  const cleaned = amount.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [wholePart, fracPart = ""] = unsigned.split(".");
  const whole = wholePart.replace(/\D/g, "") || "0";
  const frac = fracPart.replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
  const cents = Number(whole) * 100 + Number(frac || "0");
  return negative ? -cents : cents;
}

export function fromMinorUnits(amountCents: number): number {
  return amountCents / 100;
}

export function formatMoney(amountCents: number, currency = "ETB"): string {
  const major = fromMinorUnits(amountCents);
  return `${currency} ${major.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function computeDaysRemaining(endsAt?: string | null): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.floor((endDay - nowDay) / (24 * 60 * 60 * 1000));
  return days < 0 ? 0 : days;
}

export function extendEndsAtIso(currentEndsAt: string | null | undefined, days: number): string {
  const now = Date.now();
  let base = now;
  if (currentEndsAt) {
    const parsed = new Date(currentEndsAt).getTime();
    if (!Number.isNaN(parsed) && parsed > base) base = parsed;
  }
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

export function toRFC3339FromDateInput(date: string, endOfDay = false): string {
  const d = new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return d.toISOString();
}
