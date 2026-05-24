import { Info } from "lucide-react";

type StorageCostNoticeProps = {
  className?: string;
};

export function StorageCostNotice({ className }: StorageCostNoticeProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 ${className ?? ""}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Estimated only — actual Cloudflare R2 bill may differ. Costs use an approximate rate of
        $0.015/GB/month and do not include Class A/B operation fees.
      </p>
    </div>
  );
}
