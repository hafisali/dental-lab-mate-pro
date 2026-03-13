"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/components/charts/bar-chart";
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

  // Prepare chart data for Revenue vs Expenses
  const chartData = (cashFlow?.monthlyBreakdown || []).map((row) => ({
    month: `${row.month.slice(0, 3)} ${row.year}`,
    Income: row.income,
    Expenses: row.expenses,
  }));

  // Prepare horizontal bar chart data for top categories
  const categoryChartData = (cashFlow?.topCategories || []).slice(0, 6).map((cat) => ({
    category: cat.category,
    amount: cat.amount,
  }));

  return (
    <div className="space-y-6">
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

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue vs Expenses Chart */}
        <GlassCard className="lg:col-span-2" delay={0.2} padding="p-0">
          <div className="p-6 pb-2">
            <h3 className="text-base font-semibold text-foreground">Revenue vs Expenses</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Monthly comparison (last 6 months)</p>
          </div>
          <div className="px-2 pb-4">
            {chartData.length > 0 ? (
              <BarChart
                data={chartData}
                xKey="month"
                bars={[
                  { key: "Income", color: "#10b981", name: "Income" },
                  { key: "Expenses", color: "#ef4444", name: "Expenses" },
                ]}
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
        <GlassCard delay={0.25} padding="p-0">
          <div className="p-6 pb-2">
            <h3 className="text-base font-semibold text-foreground">Top Expense Categories</h3>
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

      {/* Expense List */}
      <GlassCard delay={0.3} padding="p-0">
        <div className="p-6 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Expenses</h3>
            <p className="text-sm text-muted-foreground mt-0.5">All recorded expenses</p>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] rounded-xl border-border/60">
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
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((exp, index) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(exp.date)}
                    </TableCell>
                    <TableCell className="font-semibold text-sm text-foreground">
                      {exp.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getCategoryColor(exp.category)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}
                        variant="secondary"
                      >
                        {exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {exp.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(exp.amount)}
                    </TableCell>
                  </motion.tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12"
                    >
                      <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="font-medium text-muted-foreground">No expenses found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
