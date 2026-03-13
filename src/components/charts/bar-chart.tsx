"use client";

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  bars: Array<{ key: string; color: string; name?: string; stackId?: string }>;
  height?: number;
  formatter?: (value: number, name: string) => string;
  className?: string;
  layout?: "horizontal" | "vertical";
  showGrid?: boolean;
}

export function BarChart({
  data, xKey, bars, height = 300, formatter, className,
  layout = "horizontal", showGrid = true
}: BarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={layout === "vertical" ? "vertical" : "horizontal"}
          margin={{ top: 5, right: 5, left: layout === "vertical" ? 60 : -20, bottom: 0 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />}
          {layout === "vertical" ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey={xKey} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={55} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name || bar.key}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
              stackId={bar.stackId}
              maxBarSize={40}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
