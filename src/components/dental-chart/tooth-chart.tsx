"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PERMANENT_TEETH, DECIDUOUS_TEETH, ToothInfo } from "./tooth-data";
import Tooth from "./tooth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ToothChartProps {
  selectedTeeth: number[];
  onChange: (teeth: number[]) => void;
  className?: string;
}

// Bolt Performance Optimization:
// Pre-compute static quadrant layouts once at module load instead of re-filtering
// and re-sorting 32/20 items on every render pass.
function partitionQuadrants(teeth: ToothInfo[], isPermanent: boolean) {
  const upperQ1 = teeth
    .filter((t) => t.quadrant === (isPermanent ? 1 : 5))
    .sort((a, b) => b.position - a.position);
  const upperQ2 = teeth
    .filter((t) => t.quadrant === (isPermanent ? 2 : 6))
    .sort((a, b) => a.position - b.position);
  const lowerQ3 = teeth
    .filter((t) => t.quadrant === (isPermanent ? 3 : 7))
    .sort((a, b) => b.position - a.position);
  const lowerQ4 = teeth
    .filter((t) => t.quadrant === (isPermanent ? 4 : 8))
    .sort((a, b) => a.position - b.position);

  return { upperQ1, upperQ2, lowerQ3, lowerQ4 };
}

const PERMANENT_QUADRANTS = partitionQuadrants(PERMANENT_TEETH, true);
const DECIDUOUS_QUADRANTS = partitionQuadrants(DECIDUOUS_TEETH, false);

export default function ToothChart({ selectedTeeth, onChange, className }: ToothChartProps) {
  const [chartType, setChartType] = useState<"permanent" | "deciduous">("permanent");

  // Keep a ref to the latest selectedTeeth so handleToothClick remains truly stable
  const selectedTeethRef = useRef(selectedTeeth);
  useEffect(() => {
    selectedTeethRef.current = selectedTeeth;
  }, [selectedTeeth]);

  // Bolt Performance Optimization:
  // Convert selected teeth array into a Set for O(1) membership checks during render
  // instead of calling array.includes() 32 times.
  const selectedSet = useMemo(() => new Set(selectedTeeth), [selectedTeeth]);

  // Stable callback avoids triggering unnecessary re-renders in memoized Tooth children
  const handleToothClick = useCallback(
    (id: number) => {
      const current = selectedTeethRef.current;
      if (current.includes(id)) {
        onChange(current.filter((t) => t !== id));
      } else {
        onChange([...current, id]);
      }
    },
    [onChange]
  );

  const clearSelection = useCallback(() => onChange([]), [onChange]);

  // Use pre-computed quadrants
  const { upperQ1, upperQ2, lowerQ3, lowerQ4 } =
    chartType === "permanent" ? PERMANENT_QUADRANTS : DECIDUOUS_QUADRANTS;

  // Memoize sorted selected teeth list for display badge list
  const sortedSelectedTeeth = useMemo(
    () => (selectedTeeth.length > 0 ? [...selectedTeeth].sort((a, b) => a - b) : []),
    [selectedTeeth]
  );

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
                selected={selectedSet.has(tooth.id)}
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
                selected={selectedSet.has(tooth.id)}
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
                selected={selectedSet.has(tooth.id)}
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
                selected={selectedSet.has(tooth.id)}
                onClick={handleToothClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Selected teeth display */}
      {sortedSelectedTeeth.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-sm text-muted-foreground mr-1">Selected:</span>
          {sortedSelectedTeeth.map((id) => (
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
