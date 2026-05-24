import { formatMoney } from "@/lib/admin/billing-utils";

export function MoneyText({
  amountCents,
  currency = "ETB",
  className,
}: {
  amountCents: number;
  currency?: string;
  className?: string;
}) {
  return <span className={className}>{formatMoney(amountCents, currency)}</span>;
}
