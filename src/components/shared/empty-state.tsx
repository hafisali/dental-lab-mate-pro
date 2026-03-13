"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}
    >
      <div className="relative mb-6">
        {/* Decorative rings */}
        <div className="absolute inset-0 -m-4 rounded-full border border-border/30 animate-pulse" />
        <div className="absolute inset-0 -m-8 rounded-full border border-border/20" />
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground/60" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-6 rounded-xl bg-primary hover:bg-primary/90">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
