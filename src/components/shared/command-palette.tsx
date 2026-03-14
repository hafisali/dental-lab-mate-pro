"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FolderOpen,
  Users,
  UserCircle,
  Receipt,
  Plus,
  LayoutDashboard,
  CreditCard,
  Settings,
  Calendar,
  Pill,
  UsersRound,
  Store,
  Loader2,
  FileSearch,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: "cases" | "dentists" | "patients" | "invoices";
  href: string;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: string;
}

// ─── Category config ────────────────────────────────────────────────────────

const categoryConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  cases: {
    label: "Cases",
    icon: <FolderOpen className="h-4 w-4" />,
    color: "text-sky-500",
  },
  dentists: {
    label: "Dentists",
    icon: <Users className="h-4 w-4" />,
    color: "text-emerald-500",
  },
  patients: {
    label: "Patients",
    icon: <UserCircle className="h-4 w-4" />,
    color: "text-violet-500",
  },
  invoices: {
    label: "Invoices",
    icon: <Receipt className="h-4 w-4" />,
    color: "text-amber-500",
  },
};

// ─── Quick actions ──────────────────────────────────────────────────────────

const quickActions: QuickAction[] = [
  {
    id: "new-case",
    title: "New Case",
    subtitle: "Create a new dental case",
    icon: <Plus className="h-4 w-4" />,
    href: "/cases/new",
    shortcut: "N",
  },
  {
    id: "dashboard",
    title: "View Dashboard",
    subtitle: "Go to overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: "/dashboard",
    shortcut: "D",
  },
  {
    id: "dentists",
    title: "New Dentist",
    subtitle: "Add a new dentist",
    icon: <Users className="h-4 w-4" />,
    href: "/dentists",
    shortcut: "T",
  },
  {
    id: "billing",
    title: "Billing",
    subtitle: "Manage invoices and payments",
    icon: <CreditCard className="h-4 w-4" />,
    href: "/billing",
    shortcut: "B",
  },
  {
    id: "appointments",
    title: "Appointments",
    subtitle: "Manage patient appointments",
    icon: <Calendar className="h-4 w-4" />,
    href: "/appointments",
  },
  {
    id: "prescriptions",
    title: "Prescriptions",
    subtitle: "View and manage prescriptions",
    icon: <Pill className="h-4 w-4" />,
    href: "/prescriptions",
  },
  {
    id: "staff",
    title: "Staff",
    subtitle: "Manage staff members",
    icon: <UsersRound className="h-4 w-4" />,
    href: "/staff",
  },
  {
    id: "pharmacy",
    title: "Pharmacy",
    subtitle: "Pharmacy inventory and sales",
    icon: <Store className="h-4 w-4" />,
    href: "/pharmacy",
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "App preferences and configuration",
    icon: <Settings className="h-4 w-4" />,
    href: "/settings",
    shortcut: ",",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Build the flat list of all items for keyboard navigation
  const allItems = useMemo(() => {
    if (query.length === 0) {
      return quickActions.map((a) => ({ type: "action" as const, ...a }));
    }

    // Group results by category and flatten
    const grouped: { category: string; items: SearchResult[] }[] = [];
    const categoryOrder = ["cases", "dentists", "patients", "invoices"];

    for (const cat of categoryOrder) {
      const items = results.filter((r) => r.category === cat);
      if (items.length > 0) {
        grouped.push({ category: cat, items });
      }
    }

    return grouped.flatMap((g) =>
      g.items.map((item) => ({ type: "result" as const, ...item }))
    );
  }, [query, results]);

  // Grouped results for rendering headers
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    }
    return groups;
  }, [results]);

  // ─── Keyboard shortcut to open ────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for custom event from header search button
  useEffect(() => {
    function handleOpenPalette() {
      setOpen(true);
    }
    window.addEventListener("open-command-palette", handleOpenPalette);
    return () =>
      window.removeEventListener("open-command-palette", handleOpenPalette);
  }, []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ─── Debounced search ─────────────────────────────────────────────────

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(0);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      debounceRef.current = setTimeout(() => {
        performSearch(value.trim());
      }, 300);
    },
    [performSearch]
  );

  // ─── Navigate to item ─────────────────────────────────────────────────

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // ─── Keyboard navigation ─────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : allItems.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item) {
          navigateTo(item.href);
        }
      }
    },
    [allItems, selectedIndex, navigateTo]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ─── Render helpers ───────────────────────────────────────────────────

  let flatIndex = -1;

  function getNextIndex() {
    flatIndex++;
    return flatIndex;
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            {/* Dialog content */}
            <Dialog.Content
              asChild
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="fixed left-1/2 top-[20%] z-50 w-full max-w-[560px] -translate-x-1/2 overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-xl dark:bg-card/90"
              >
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-border/50 px-4">
                  <Search className="h-5 w-5 shrink-0 text-muted-foreground/60" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search cases, dentists, patients..."
                    className="h-14 w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none"
                  />
                  {loading && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground/60" />
                  )}
                  <kbd className="hidden sm:inline-flex shrink-0 h-6 items-center rounded-md border border-border/50 bg-muted/50 px-1.5 font-mono text-[11px] text-muted-foreground">
                    ESC
                  </kbd>
                </div>

                {/* Results area */}
                <div
                  ref={listRef}
                  className="max-h-[360px] overflow-y-auto overscroll-contain p-2"
                >
                  {/* Quick actions (when no query) */}
                  {query.length === 0 && (
                    <div>
                      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        Quick Actions
                      </div>
                      {quickActions.map((action) => {
                        const idx = getNextIndex();
                        return (
                          <button
                            key={action.id}
                            data-index={idx}
                            onClick={() => navigateTo(action.href)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100",
                              selectedIndex === idx
                                ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-100",
                                selectedIndex === idx
                                  ? "bg-indigo-500/15 text-indigo-500"
                                  : "bg-muted/50 text-muted-foreground"
                              )}
                            >
                              {action.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {action.title}
                              </div>
                              <div className="text-xs text-muted-foreground/60 truncate">
                                {action.subtitle}
                              </div>
                            </div>
                            {action.shortcut && (
                              <kbd className="hidden sm:inline-flex shrink-0 h-5 items-center rounded border border-border/40 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground/50">
                                {action.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Search results */}
                  {query.length > 0 && !loading && results.length > 0 && (
                    <div>
                      {(
                        ["cases", "dentists", "patients", "invoices"] as const
                      ).map((cat) => {
                        const items = groupedResults[cat];
                        if (!items || items.length === 0) return null;
                        const config = categoryConfig[cat];

                        return (
                          <div key={cat} className="mb-1">
                            <div className="flex items-center gap-2 px-2 py-1.5">
                              <span className={config.color}>
                                {config.icon}
                              </span>
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                                {config.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground/30">
                                {items.length}
                              </span>
                            </div>
                            {items.map((result) => {
                              const idx = getNextIndex();
                              return (
                                <button
                                  key={result.id}
                                  data-index={idx}
                                  onClick={() => navigateTo(result.href)}
                                  onMouseEnter={() => setSelectedIndex(idx)}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100",
                                    selectedIndex === idx
                                      ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-foreground"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-100",
                                      selectedIndex === idx
                                        ? "bg-indigo-500/15 text-indigo-500"
                                        : "bg-muted/50 text-muted-foreground"
                                    )}
                                  >
                                    {config.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {result.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground/60 truncate">
                                      {result.subtitle}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      "shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
                                      cat === "cases" &&
                                        "bg-sky-500/10 text-sky-500 border-sky-500/20",
                                      cat === "dentists" &&
                                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                      cat === "patients" &&
                                        "bg-violet-500/10 text-violet-500 border-violet-500/20",
                                      cat === "invoices" &&
                                        "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    )}
                                  >
                                    {config.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Loading state */}
                  {query.length > 0 && loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                      <Loader2 className="h-6 w-6 animate-spin mb-3" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  )}

                  {/* Empty state */}
                  {query.length > 0 && !loading && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                      <FileSearch className="h-10 w-10 mb-3 opacity-40" />
                      <span className="text-sm font-medium">
                        No results found
                      </span>
                      <span className="text-xs mt-1">
                        Try searching for a case number, dentist name, or
                        patient
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer with keyboard hints */}
                <div className="flex items-center gap-4 border-t border-border/50 px-4 py-2.5 text-[11px] text-muted-foreground/40">
                  <div className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 items-center rounded border border-border/40 bg-muted/40 px-1">
                      <ArrowUp className="h-3 w-3" />
                    </kbd>
                    <kbd className="inline-flex h-5 items-center rounded border border-border/40 bg-muted/40 px-1">
                      <ArrowDown className="h-3 w-3" />
                    </kbd>
                    <span className="ml-1">Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 items-center rounded border border-border/40 bg-muted/40 px-1">
                      <CornerDownLeft className="h-3 w-3" />
                    </kbd>
                    <span className="ml-1">Open</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 items-center rounded border border-border/40 bg-muted/40 px-1 font-mono text-[10px]">
                      ESC
                    </kbd>
                    <span className="ml-1">Close</span>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
