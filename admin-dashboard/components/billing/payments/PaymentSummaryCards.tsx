import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyText } from "@/components/billing/MoneyText";
import type { NormalizedPayment } from "@/lib/admin/billing-types";

export function PaymentSummaryCards({ items }: { items: NormalizedPayment[] }) {
  const pending = items.filter((p) => p.status === "PENDING");
  const approved = items.filter((p) => p.status === "APPROVED");
  const rejected = items.filter((p) => p.status === "REJECTED");
  const approvedTotal = approved.reduce((sum, p) => sum + p.amountCents, 0);
  const pendingTotal = pending.reduce((sum, p) => sum + p.amountCents, 0);

  const cards = [
    { label: "Pending", value: String(pending.length) },
    { label: "Approved", value: String(approved.length) },
    { label: "Rejected", value: String(rejected.length) },
    { label: "Pending amount", value: <MoneyText amountCents={pendingTotal} /> },
    { label: "Approved total", value: <MoneyText amountCents={approvedTotal} /> },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{card.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}
