import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyText } from "@/components/billing/MoneyText";
import type { NormalizedInvoice } from "@/lib/admin/billing-types";

export function InvoiceSummaryCards({ items }: { items: NormalizedInvoice[] }) {
  const open = items.filter((i) => i.status === "OPEN");
  const paid = items.filter((i) => i.status === "PAID");
  const voided = items.filter((i) => i.status === "VOID" || i.status === "VOIDED");
  const openTotal = open.reduce((sum, i) => sum + i.amountCents, 0);
  const paidTotal = paid.reduce((sum, i) => sum + i.amountCents, 0);

  const cards = [
    { label: "Open", value: String(open.length) },
    { label: "Paid", value: String(paid.length) },
    { label: "Voided", value: String(voided.length) },
    { label: "Open amount", value: <MoneyText amountCents={openTotal} /> },
    { label: "Paid total", value: <MoneyText amountCents={paidTotal} /> },
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
