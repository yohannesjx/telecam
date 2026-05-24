import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NormalizedSubscription } from "@/lib/admin/billing-types";

export function SubscriptionSummaryCards({ items }: { items: NormalizedSubscription[] }) {
  const active = items.filter((s) => s.status === "ACTIVE").length;
  const trial = items.filter((s) => s.status === "TRIAL").length;
  const pastDue = items.filter((s) => s.status === "PAST_DUE").length;
  const endingSoon = items.filter((s) => {
    if (s.daysRemaining === null || s.daysRemaining === undefined) return false;
    return s.daysRemaining <= 7 && (s.status === "ACTIVE" || s.status === "TRIAL");
  }).length;

  const cards = [
    { label: "Active", value: active },
    { label: "Trial", value: trial },
    { label: "Past due / blocked", value: pastDue + items.filter((s) => s.status === "BLOCKED").length },
    { label: "Ending in 7 days", value: endingSoon },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
