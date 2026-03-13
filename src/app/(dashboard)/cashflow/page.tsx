"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  TrendingDown,
  Wallet,
  AlertCircle,
  Loader2,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  FolderOpen,
  Filter,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
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
    Materials: "bg-blue-50 text-blue-700 border border-blue-200",
    Rent: "bg-purple-50 text-purple-700 border border-purple-200",
    Salary: "bg-green-50 text-green-700 border border-green-200",
    Utilities: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    Equipment: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    Marketing: "bg-pink-50 text-pink-700 border border-pink-200",
    Transport: "bg-orange-50 text-orange-700 border border-orange-200",
    Other: "bg-slate-100 text-slate-700 border border-slate-200",
  };
  return colors[category] || "bg-slate-100 text-slate-700 border border-slate-200";
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cash Flow</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track income, expenses & net profit</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const cm = cashFlow?.currentMonth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cash Flow</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track income, expenses & net profit
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md shadow-red-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Income (This Month)
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(cm?.income || 0)}
                </p>
                {cashFlow?.lastMonth && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last month: {formatCurrency(cashFlow.lastMonth.income)}
                  </p>
                )}
              </div>
              <div className="bg-green-50 text-green-600 p-2.5 rounded-xl">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-rose-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expenses (This Month)
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(cm?.expenses || 0)}
                </p>
                {cashFlow?.lastMonth && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last month: {formatCurrency(cashFlow.lastMonth.expenses)}
                  </p>
                )}
              </div>
              <div className="bg-red-50 text-red-600 p-2.5 rounded-xl">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Net Profit (This Month)
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    (cm?.net || 0) >= 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(cm?.net || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Collection rate: {cashFlow?.collectionRate || 0}%
                </p>
              </div>
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {formatCurrency(cashFlow?.outstandingReceivables || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Unpaid invoices
                </p>
              </div>
              <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Last 3 Months
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Income</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(cashFlow?.last3Months?.income || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Expenses</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(cashFlow?.last3Months?.expenses || 0)}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2.5 flex justify-between text-sm font-semibold">
                <span className="text-slate-700">Net</span>
                <span
                  className={
                    (cashFlow?.last3Months?.net || 0) >= 0
                      ? "text-blue-600"
                      : "text-red-600"
                  }
                >
                  {formatCurrency(cashFlow?.last3Months?.net || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Last 6 Months
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Income</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(cashFlow?.last6Months?.income || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Expenses</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(cashFlow?.last6Months?.expenses || 0)}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2.5 flex justify-between text-sm font-semibold">
                <span className="text-slate-700">Net</span>
                <span
                  className={
                    (cashFlow?.last6Months?.net || 0) >= 0
                      ? "text-blue-600"
                      : "text-red-600"
                  }
                >
                  {formatCurrency(cashFlow?.last6Months?.net || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Top Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              {(cashFlow?.topCategories || []).slice(0, 5).map((cat) => (
                <div key={cat.category} className="flex justify-between items-center text-sm">
                  <Badge
                    className={`${getCategoryColor(cat.category)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}
                    variant="secondary"
                  >
                    {cat.category}
                  </Badge>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(cat.amount)}
                  </span>
                </div>
              ))}
              {(!cashFlow?.topCategories ||
                cashFlow.topCategories.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No expenses recorded
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-purple-500" />
            Monthly Breakdown (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Income</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Expenses</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(cashFlow?.monthlyBreakdown || []).map((row) => (
                  <TableRow key={`${row.month}-${row.year}`} className="hover:bg-sky-50/30 transition-colors">
                    <TableCell className="font-semibold text-sm text-slate-700">
                      {row.month} {row.year}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-600 font-semibold">
                      {formatCurrency(row.income)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-600 font-semibold">
                      {formatCurrency(row.expenses)}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm font-semibold ${
                        row.net >= 0 ? "text-blue-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(row.net)}
                    </TableCell>
                  </TableRow>
                ))}
                {(!cashFlow?.monthlyBreakdown ||
                  cashFlow.monthlyBreakdown.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-12"
                    >
                      <Wallet className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-medium text-slate-500">No data available</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Expenses
            </CardTitle>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px] rounded-xl border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
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
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-sky-50/30 transition-colors">
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(exp.date)}
                    </TableCell>
                    <TableCell className="font-semibold text-sm text-slate-700">
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
                    <TableCell className="hidden sm:table-cell text-sm text-slate-400">
                      {exp.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-red-600">
                      {formatCurrency(exp.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12"
                    >
                      <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-medium text-slate-500">No expenses found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Description *</Label>
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
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Amount *</Label>
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
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Category *</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(v) =>
                    setExpenseForm({ ...expenseForm, category: v })
                  }
                >
                  <SelectTrigger className="rounded-xl">
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
              <Label className="text-sm font-medium text-slate-700">Date</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Notes</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, notes: e.target.value })
                }
                rows={2}
                placeholder="Optional notes..."
                className="rounded-xl"
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
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700">
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
