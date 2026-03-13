"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PERMANENT_TEETH, DECIDUOUS_TEETH } from "./tooth-data";
import Tooth from "./tooth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ToothChartProps {
  selectedTeeth: number[];
  onChange: (teeth: number[]) => void;
  className?: string;
}

export default function ToothChart({ selectedTeeth, onChange, className }: ToothChartProps) {
  const [chartType, setChartType] = useState<"permanent" | "deciduous">("permanent");

  const teeth = chartType === "permanent" ? PERMANENT_TEETH : DECIDUOUS_TEETH;

  const handleToothClick = (id: number) => {
    if (selectedTeeth.includes(id)) {
      onChange(selectedTeeth.filter((t) => t !== id));
    } else {
      onChange([...selectedTeeth, id]);
    }
  };

  const clearSelection = () => onChange([]);

  // Split teeth into upper and lower rows
  const upperTeeth = teeth.filter(
    (t) =>
      t.quadrant === (chartType === "permanent" ? 1 : 5) ||
      t.quadrant === (chartType === "permanent" ? 2 : 6)
  );
  const lowerTeeth = teeth.filter(
    (t) =>
      t.quadrant === (chartType === "permanent" ? 3 : 7) ||
      t.quadrant === (chartType === "permanent" ? 4 : 8)
  );

  // Sort for display: upper row goes right-to-left for Q1 then left-to-right for Q2
  const upperQ1 = upperTeeth
    .filter((t) => t.quadrant === (chartType === "permanent" ? 1 : 5))
    .sort((a, b) => b.position - a.position);
  const upperQ2 = upperTeeth
    .filter((t) => t.quadrant === (chartType === "permanent" ? 2 : 6))
    .sort((a, b) => a.position - b.position);
  const lowerQ3 = lowerTeeth
    .filter((t) => t.quadrant === (chartType === "permanent" ? 3 : 7))
    .sort((a, b) => b.position - a.position);
  const lowerQ4 = lowerTeeth
    .filter((t) => t.quadrant === (chartType === "permanent" ? 4 : 8))
    .sort((a, b) => a.position - b.position);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Chart type toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={chartType === "permanent" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("permanent")}
          >
            Permanent (32)
          </Button>
          <Button
            type="button"
            variant={chartType === "deciduous" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("deciduous")}
          >
            Deciduous (20)
          </Button>
        </div>
        {selectedTeeth.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
            Clear All
          </Button>
        )}
      </div>

      {/* Dental Chart */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {/* Quadrant labels */}
        <div className="grid grid-cols-2 gap-4 mb-2 text-xs text-muted-foreground text-center">
          <span>Right</span>
          <span>Left</span>
        </div>

        {/* Upper Jaw */}
        <div className="flex justify-center items-end gap-0 sm:gap-0.5 pb-3 border-b-2 border-dashed border-muted-foreground/30">
          <div className="flex gap-0 sm:gap-0.5">
            {upperQ1.map((tooth) => (
              <Tooth
                key={tooth.id}
                tooth={tooth}
                selected={selectedTeeth.includes(tooth.id)}
                onClick={handleToothClick}
              />
            ))}
          </div>
          <div className="w-px h-16 bg-muted-foreground/30 mx-1" />
          <div className="flex gap-0 sm:gap-0.5">
            {upperQ2.map((tooth) => (
              <Tooth
                key={tooth.id}
                tooth={tooth}
                selected={selectedTeeth.includes(tooth.id)}
                onClick={handleToothClick}
              />
            ))}
          </div>
        </div>

        {/* Lower Jaw */}
        <div className="flex justify-center items-start gap-0 sm:gap-0.5 pt-3">
          <div className="flex gap-0 sm:gap-0.5">
            {lowerQ4.map((tooth) => (
              <Tooth
                key={tooth.id}
                tooth={tooth}
                selected={selectedTeeth.includes(tooth.id)}
                onClick={handleToothClick}
              />
            ))}
          </div>
          <div className="w-px h-16 bg-muted-foreground/30 mx-1" />
          <div className="flex gap-0 sm:gap-0.5">
            {lowerQ3.map((tooth) => (
              <Tooth
                key={tooth.id}
                tooth={tooth}
                selected={selectedTeeth.includes(tooth.id)}
                onClick={handleToothClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Selected teeth display */}
      {selectedTeeth.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-sm text-muted-foreground mr-1">Selected:</span>
          {selectedTeeth.sort((a, b) => a - b).map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => handleToothClick(id)}
            >
              {id}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
