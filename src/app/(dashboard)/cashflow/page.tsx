"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  TrendingUp,
  DollarSign,
  ArrowDownCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
  Filter,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/components/charts/bar-chart";
import { AreaChart } from "@/components/charts/area-chart";
import toast from "react-hot-toast";

const EXPENSE_CATEGORIES = [
  "Materials",
  "Rent",
  "Salary",
  "Utilities",
  "Equipment",
  "Marketing",
  "Transport",
  "Other",
];

const categoryIcons: Record<string, string> = {
  Materials: "M",
  Rent: "R",
  Salary: "S",
  Utilities: "U",
  Equipment: "E",
  Marketing: "Mk",
  Transport: "T",
  Other: "O",
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    Materials: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    Rent: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
    Salary: "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
    Utilities: "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800",
    Equipment: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
    Marketing: "bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800",
    Transport: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
    Other: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
  };
  return colors[category] || "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700";
};

const getCategoryGradient = (category: string): string => {
  const colors: Record<string, string> = {
    Materials: "from-blue-400 to-blue-600",
    Rent: "from-purple-400 to-purple-600",
    Salary: "from-green-400 to-green-600",
    Utilities: "from-yellow-400 to-yellow-600",
    Equipment: "from-indigo-400 to-indigo-600",
    Marketing: "from-pink-400 to-pink-600",
    Transport: "from-orange-400 to-orange-600",
    Other: "from-slate-400 to-slate-600",
  };
  return colors[category] || "from-slate-400 to-slate-600";
};

interface CashFlowData {
  currentMonth: { income: number; expenses: number; net: number };
  lastMonth: { income: number; expenses: number; net: number };
  last3Months: { income: number; expenses: number; net: number };
  last6Months: { income: number; expenses: number; net: number };
  monthlyBreakdown: {
    month: string;
    year: number;
    income: number;
    expenses: number;
    net: number;
  }[];
  topCategories: { category: string; amount: number }[];
  outstandingReceivables: number;
  collectionRate: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

export default function CashFlowPage() {
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "Materials",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const fetchData = async () => {
    try {
      const [cfRes, expRes] = await Promise.all([
        fetch("/api/cashflow").then((r) => r.json()),
        fetch("/api/expenses").then((r) => r.json()),
      ]);
      setCashFlow(cfRes);
      setExpenses(Array.isArray(expRes) ? expRes : []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error("Description and amount are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Expense added!");
      setAddDialogOpen(false);
      setExpenseForm({
        description: "",
        amount: "",
        category: "Materials",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setLoading(true);
      fetchData();
    } catch {
      toast.error("Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  const filteredExpenses =
    filterCategory === "all"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cash Flow" subtitle="Track income, expenses & profitability" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl bg-muted/60" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[350px] rounded-2xl bg-muted/60 lg:col-span-2" />
          <Skeleton className="h-[350px] rounded-2xl bg-muted/60" />
        </div>
        <Skeleton className="h-[400px] rounded-2xl bg-muted/60" />
      </div>
    );
  }

  const cm = cashFlow?.currentMonth;

  // Prepare area chart data for Income vs Expenses
  const areaChartData = (cashFlow?.monthlyBreakdown || []).map((row) => ({
    month: `${row.month.slice(0, 3)} ${row.year}`,
    Income: row.income,
    Expenses: row.expenses,
  }));

  // Prepare horizontal bar chart data for top categories
  const categoryChartData = (cashFlow?.topCategories || []).slice(0, 6).map((cat) => ({
    category: cat.category,
    amount: cat.amount,
  }));

  // Monthly summary cards data
  const monthlyCards = (cashFlow?.monthlyBreakdown || []).slice(-3).reverse();

  return (
    <div className="space-y-8 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <PageHeader title="Cash Flow" subtitle="Track income, expenses & profitability">
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </PageHeader>

      {/* Summary StatCards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Income (This Month)"
          value={cm?.income || 0}
          format={formatCurrency}
          icon={DollarSign}
          color="emerald"
          delay={0}
          trend={cashFlow?.lastMonth ? {
            value: cashFlow.lastMonth.income > 0
              ? Math.round(((cm?.income || 0) - cashFlow.lastMonth.income) / cashFlow.lastMonth.income * 100)
              : 0,
            label: "vs last month",
          } : undefined}
        />
        <StatCard
          title="Expenses (This Month)"
          value={cm?.expenses || 0}
          format={formatCurrency}
          icon={ArrowDownCircle}
          color="rose"
          delay={0.05}
          trend={cashFlow?.lastMonth ? {
            value: cashFlow.lastMonth.expenses > 0
              ? Math.round(((cm?.expenses || 0) - cashFlow.lastMonth.expenses) / cashFlow.lastMonth.expenses * 100)
              : 0,
            label: "vs last month",
          } : undefined}
        />
        <StatCard
          title="Net Profit"
          value={cm?.net || 0}
          format={formatCurrency}
          icon={TrendingUp}
          color="indigo"
          delay={0.1}
          trend={{ value: cashFlow?.collectionRate || 0, label: "collection rate" }}
        />
        <StatCard
          title="Outstanding"
          value={cashFlow?.outstandingReceivables || 0}
          format={formatCurrency}
          icon={AlertCircle}
          color="amber"
          delay={0.15}
        />
      </div>

      {/* Monthly Summary Cards */}
      {monthlyCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {monthlyCards.map((m, index) => (
            <motion.div
              key={`${m.month}-${m.year}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="rounded-2xl bg-card border border-border/50 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">{m.month.slice(0, 3)} {m.year}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Income</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(m.income)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-xs text-muted-foreground">Expenses</span>
                  </div>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(m.expenses)}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Net</span>
                  <span className={`text-sm font-black tabular-nums ${m.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatCurrency(m.net)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Income vs Expenses Area Chart */}
        <GlassCard className="lg:col-span-2" delay={0.25} padding="p-0">
          <div className="p-6 pb-2">
            <h3 className="text-base font-bold text-foreground tracking-tight">Income vs Expenses</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Monthly comparison trend</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Income
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Expenses
              </div>
            </div>
          </div>
          <div className="px-2 pb-4">
            {areaChartData.length > 0 ? (
              <AreaChart
                data={areaChartData}
                xKey="month"
                yKey="Income"
                yKey2="Expenses"
                yLabel="Income"
                yLabel2="Expenses"
                color="#10b981"
                color2="#ef4444"
                height={280}
                formatter={(value) => formatCurrency(value)}
              />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </div>
        </GlassCard>

        {/* Top Expense Categories */}
        <GlassCard delay={0.3} padding="p-0">
          <div className="p-6 pb-2">
            <h3 className="text-base font-bold text-foreground tracking-tight">Top Categories</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Where your money goes</p>
          </div>
          <div className="px-2 pb-4">
            {categoryChartData.length > 0 ? (
              <BarChart
                data={categoryChartData}
                xKey="category"
                bars={[{ key: "amount", color: "#6366f1", name: "Amount" }]}
                height={280}
                layout="vertical"
                formatter={(value) => formatCurrency(value)}
              />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No expenses recorded
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Expense List - Premium */}
      <GlassCard delay={0.35} padding="p-0">
        <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
              <Receipt className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">Expense Log</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/60">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="px-6 pb-6">
          <div className="space-y-2">
            {filteredExpenses.map((exp, index) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/30 hover:bg-accent/30 transition-all duration-200 group"
              >
                {/* Category icon */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getCategoryGradient(exp.category)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}>
                  {categoryIcons[exp.category] || "?"}
                </div>

                {/* Description & category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      className={`${getCategoryColor(exp.category)} text-[10px] font-medium rounded-full px-2 py-0`}
                      variant="secondary"
                    >
                      {exp.category}
                    </Badge>
                    {exp.notes && <span className="text-xs text-muted-foreground/60 truncate">{exp.notes}</span>}
                  </div>
                </div>

                {/* Date & amount */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatCurrency(exp.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(exp.date)}</p>
                </div>
              </motion.div>
            ))}
            {filteredExpenses.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-foreground">No expenses found</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first expense to start tracking</p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Add Expense Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Description *</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
                placeholder="e.g., Zirconia blocks purchase"
                required
                className="rounded-xl border-border/60 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Amount *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                  required
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Category *</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(v) =>
                    setExpenseForm({ ...expenseForm, category: v })
                  }
                >
                  <SelectTrigger className="rounded-xl border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Date</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="rounded-xl border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Notes</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, notes: e.target.value })
                }
                rows={2}
                placeholder="Optional notes..."
                className="rounded-xl border-border/60"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
