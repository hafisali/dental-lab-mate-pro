"use client";

import { cn } from "@/lib/utils";
import { ToothInfo } from "./tooth-data";

interface ToothProps {
  tooth: ToothInfo;
  selected: boolean;
  onClick: (id: number) => void;
}

function getToothShape(type: string, isUpper: boolean): string {
  // SVG paths for different tooth types
  if (type === "molar") {
    return isUpper
      ? "M4,2 Q4,0 8,0 L24,0 Q28,0 28,2 L30,14 Q30,20 26,22 L22,24 Q16,26 10,24 L6,22 Q2,20 2,14 Z"
      : "M2,4 Q2,0 6,2 L10,4 Q16,2 22,4 L26,2 Q30,0 30,4 L28,18 Q28,24 24,24 L8,24 Q4,24 4,18 Z";
  }
  if (type === "premolar") {
    return isUpper
      ? "M6,2 Q6,0 10,0 L22,0 Q26,0 26,2 L28,14 Q28,20 24,22 L20,23 Q16,24 12,23 L8,22 Q4,20 4,14 Z"
      : "M4,4 Q4,0 8,2 L12,3 Q16,2 20,3 L24,2 Q28,0 28,4 L26,18 Q26,24 22,24 L10,24 Q6,24 6,18 Z";
  }
  if (type === "canine") {
    return isUpper
      ? "M8,2 Q8,0 12,0 L20,0 Q24,0 24,2 L26,16 Q26,22 22,24 L18,26 Q16,27 14,26 L10,24 Q6,22 6,16 Z"
      : "M6,2 Q6,0 10,2 L14,3 Q16,2 18,3 L22,2 Q26,0 26,2 L24,18 Q24,26 20,26 L12,26 Q8,26 8,18 Z";
  }
  // incisor
  return isUpper
    ? "M8,2 Q8,0 12,0 L20,0 Q24,0 24,2 L25,16 Q25,22 21,23 L16,24 Q14,24 11,23 Q7,22 7,16 Z"
    : "M7,2 Q7,0 11,1 L16,2 Q20,1 21,1 Q25,0 25,2 L24,18 Q24,24 20,24 L12,24 Q8,24 8,18 Z";
}

export default function Tooth({ tooth, selected, onClick }: ToothProps) {
  const isUpper = tooth.quadrant <= 2 || tooth.quadrant === 5 || tooth.quadrant === 6;
  const path = getToothShape(tooth.type, isUpper);

  return (
    <button
      type="button"
      onClick={() => onClick(tooth.id)}
      className={cn(
        "relative group flex flex-col items-center gap-1 transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-0.5"
      )}
      title={`${tooth.id} - ${tooth.name}`}
    >
      <svg
        viewBox="0 0 32 28"
        className={cn(
          "w-8 h-7 sm:w-10 sm:h-9 transition-all duration-150 tooth-svg",
          selected
            ? "fill-primary stroke-primary/80 selected"
            : "fill-muted stroke-border group-hover:fill-primary/20"
        )}
        strokeWidth="1"
      >
        <path d={path} />
      </svg>
      <span
        className={cn(
          "text-[10px] font-medium leading-none",
          selected ? "text-primary font-bold" : "text-muted-foreground"
        )}
      >
        {tooth.id}
      </span>
    </button>
  );
}
