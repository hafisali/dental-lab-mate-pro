"use client";

import { cn } from "@/lib/utils";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
  className?: string;
}

export function ChartTooltip({ active, payload, label, formatter, className }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className={cn(
      "rounded-xl border border-border/50 bg-card shadow-lg px-4 py-3 text-sm",
      "backdrop-blur-sm",
      className
    )}>
      {label && <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground ml-auto">
              {formatter ? formatter(entry.value, entry.name) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
