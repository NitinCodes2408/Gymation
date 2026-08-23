"use client";

import { useState } from "react";
import { useApp, Expense, ExpenseCategory } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  Edit, 
  Trash2, 
  TrendingDown, 
  Calendar, 
  Zap, 
  CreditCard,
  ArrowUpDown,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Electricity",
  "Water",
  "Rent",
  "Equipment",
  "Equipment Maintenance",
  "Staff Salary",
  "Cleaning",
  "Marketing",
  "Internet",
  "Miscellaneous",
  "Other"
];

const PAYMENT_METHODS: Expense["paymentMethod"][] = [
  "Cash",
  "Card",
  "UPI",
  "Bank Transfer",
  "Cheque"
];

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, settings } = useApp();

  // Search & Filter states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "title">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [deleteExpenseItem, setDeleteExpenseItem] = useState<Expense | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    category: ExpenseCategory;
    amount: string;
    date: string;
    paymentMethod: Expense["paymentMethod"];
    description: string;
    addedBy: string;
  }>({
    title: "",
    category: "Electricity",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Bank Transfer",
    description: "",
    addedBy: "Admin",
  });

  // Calculate Metrics
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = now.toISOString().split("T")[0];

  // Current week boundaries (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  const thisMonthExpenses = expenses
    .filter((e) => e.date.startsWith(currentMonthStr))
    .reduce((acc, e) => acc + e.amount, 0);

  const thisWeekExpenses = expenses
    .filter((e) => e.date >= sevenDaysAgoStr && e.date <= todayStr)
    .reduce((acc, e) => acc + e.amount, 0);

  const todayExpenses = expenses
    .filter((e) => e.date === todayStr)
    .reduce((acc, e) => acc + e.amount, 0);

  const largestExpense = expenses.length > 0
    ? Math.max(...expenses.map((e) => e.amount))
    : 0;

  // Filter & Sort Logic
  const filteredExpenses = expenses
    .filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(search.toLowerCase()));

      const matchCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchMethod = methodFilter === "all" || e.paymentMethod === methodFilter;

      let matchDate = true;
      if (startDate && endDate) {
        matchDate = e.date >= startDate && e.date <= endDate;
      } else if (startDate) {
        matchDate = e.date >= startDate;
      } else if (endDate) {
        matchDate = e.date <= endDate;
      }

      return matchSearch && matchCategory && matchMethod && matchDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      } else if (sortField === "title") {
        comparison = a.title.localeCompare(b.title);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      title: "",
      category: "Electricity",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "Bank Transfer",
      description: "",
      addedBy: "Admin",
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditExpense(expense);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      description: expense.description || "",
      addedBy: expense.addedBy || "Admin",
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid expense amount greater than 0");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Expense title is required");
      return;
    }

    addExpense({
      title: formData.title.trim(),
      category: formData.category,
      amount: numAmount,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      description: formData.description.trim(),
      addedBy: formData.addedBy.trim() || "Admin",
    });

    setIsAddOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpense) return;

    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid expense amount greater than 0");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Expense title is required");
      return;
    }

    updateExpense(editExpense.id, {
      title: formData.title.trim(),
      category: formData.category,
      amount: numAmount,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      description: formData.description.trim(),
      addedBy: formData.addedBy.trim() || "Admin",
    });

    setEditExpense(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteExpenseItem) {
      deleteExpense(deleteExpenseItem.id);
      setDeleteExpenseItem(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error("No expenses data to export");
      return;
    }

    const headers = "Expense ID,Title,Category,Amount (INR),Date,Payment Method,Added By,Description\n";
    const rows = filteredExpenses
      .map(
        (e) =>
          `"${e.id}","${e.title.replace(/"/g, '""')}","${e.category}",${e.amount},"${e.date}","${e.paymentMethod}","${e.addedBy}","${(e.description || "").replace(/"/g, '""')}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Gym_Expenses_${new Date().toISOString().split("T")[0]}.csv`);
    a.click();
    toast.success("Expenses exported to CSV successfully!");
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const getCategoryBadgeVariant = (category: ExpenseCategory) => {
    switch (category) {
      case "Rent":
      case "Staff Salary":
        return "danger";
      case "Electricity":
      case "Water":
      case "Internet":
        return "warning";
      case "Equipment":
      case "Equipment Maintenance":
        return "info";
      case "Marketing":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Expenses Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor, record, and categorize gym operating expenditures in INR (₹).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300" onClick={handleExportCSV}>
            <Download size={16} />
            Export CSV
          </Button>
          <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300" onClick={handlePrintPDF}>
            <Printer size={16} />
            Print Report
          </Button>
          <Button onClick={handleOpenAdd} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={16} />
            Add Expense
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-xl">
              <TrendingDown size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Expenses</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {formatCurrency(totalExpenses)}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{expenses.length} total entries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">This Month</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {formatCurrency(thisMonthExpenses)}
              </h4>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">Current billing cycle</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Receipt size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">This Week</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {formatCurrency(thisWeekExpenses)}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Last 7 days outflow</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Receipt size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Today's Expenses</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {formatCurrency(todayExpenses)}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{todayStr}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
              <Zap size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Largest Expense</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {formatCurrency(largestExpense)}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Single peak outlay</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Hub */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm shadow-sm transition-all"
              placeholder="Search expenses by title or category..."
            />
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Payment Method Dropdown */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>

            {/* Date Range Filters */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-sm text-xs">
              <span className="text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-100 outline-none text-xs"
              />
              <span className="text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-100 outline-none text-xs"
              />
            </div>

            {(search || categoryFilter !== "all" || methodFilter !== "all" || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setMethodFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={<Receipt size={48} className="text-slate-300 dark:text-slate-700" />}
            title="No expenses found"
            description="No expense transactions match your filters or query."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setMethodFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-800">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("title")}>
                    <div className="flex items-center gap-1">
                      Expense Title {sortField === "title" && (sortOrder === "asc" ? "▲" : "▼")}
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("amount")}>
                    <div className="flex items-center gap-1">
                      Amount {sortField === "amount" && (sortOrder === "asc" ? "▲" : "▼")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    <div className="flex items-center gap-1">
                      Date {sortField === "date" && (sortOrder === "asc" ? "▲" : "▼")}
                    </div>
                  </TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="dark:border-slate-800">
                    <TableCell>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {expense.title}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{expense.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadgeVariant(expense.category)}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 dark:text-slate-100">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                      {expense.date}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs font-medium">
                        {expense.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">{expense.addedBy}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewExpense(expense)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(expense)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Expense"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteExpenseItem(expense)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Record Gym Expense">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expense Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              placeholder="e.g. Electricity Bill - July"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
                placeholder="8500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as Expense["paymentMethod"] })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Added By</label>
            <input
              type="text"
              value={formData.addedBy}
              onChange={(e) => setFormData({ ...formData, addedBy: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              placeholder="Admin / Manager Name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description / Vendor Notes</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm resize-none outline-none"
              placeholder="Invoice reference, vendor details, memo..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={editExpense !== null} onClose={() => setEditExpense(null)} title="Edit Gym Expense">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expense Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as Expense["paymentMethod"] })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Added By</label>
            <input
              type="text"
              value={formData.addedBy}
              onChange={(e) => setFormData({ ...formData, addedBy: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm resize-none outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditExpense(null)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Expense Details Modal */}
      <Modal isOpen={viewExpense !== null} onClose={() => setViewExpense(null)} title="Expense Details">
        {viewExpense && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewExpense.title}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {viewExpense.id}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(viewExpense.amount)}
                </p>
                <Badge variant={getCategoryBadgeVariant(viewExpense.category)} className="mt-1">
                  {viewExpense.category}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Expense Date</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewExpense.date}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Payment Method</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewExpense.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recorded By</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewExpense.addedBy}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Category Group</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewExpense.category}</p>
              </div>
            </div>

            {viewExpense.description && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-750">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Description / Memo</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {viewExpense.description}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setViewExpense(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const exp = viewExpense;
                  setViewExpense(null);
                  handleOpenEdit(exp);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit Expense
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteExpenseItem !== null} onClose={() => setDeleteExpenseItem(null)} title="Delete Expense Record">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete the expense{" "}
            <strong>"{deleteExpenseItem?.title}"</strong> of{" "}
            <strong>
              {formatCurrency(deleteExpenseItem?.amount)}
            </strong>
            ? This action cannot be undone and will update your financial totals immediately.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteExpenseItem(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
