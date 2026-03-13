"use client";

import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { cn } from "@/lib/utils";

interface AreaChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  yKey2?: string;
  color?: string;
  color2?: string;
  height?: number;
  formatter?: (value: number, name: string) => string;
  className?: string;
  showGrid?: boolean;
  yLabel?: string;
  yLabel2?: string;
}

export function AreaChart({
  data, xKey, yKey, yKey2, color = "#6366f1", color2 = "#10b981",
  height = 300, formatter, className, showGrid = true, yLabel, yLabel2
}: AreaChartProps) {
  const id = `area-gradient-${yKey}`;
  const id2 = `area-gradient-${yKey2}`;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            {yKey2 && (
              <linearGradient id={id2} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color2} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color2} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />}
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} />
          <Area
            type="monotone"
            dataKey={yKey}
            name={yLabel || yKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${id})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "var(--card)" }}
          />
          {yKey2 && (
            <Area
              type="monotone"
              dataKey={yKey2}
              name={yLabel2 || yKey2}
              stroke={color2}
              strokeWidth={2.5}
              fill={`url(#${id2})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: "var(--card)" }}
            />
          )}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
