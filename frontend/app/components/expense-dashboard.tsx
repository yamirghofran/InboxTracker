import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Eye, Pencil, Trash } from "lucide-react"
import { Plus } from 'lucide-react'
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { PencilIcon, TrashIcon, Loader2 } from "lucide-react"
import { Form, useSubmit, useNavigation } from "@remix-run/react"
import { format } from 'date-fns'
import { ExpenseWithCategoryName, Category, Expense } from '~/types'
import { extractExpense } from '~/util';
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts'
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

function Footer() {
  return (
    <footer className="mt-8 py-4 text-center text-sm text-gray-500 border-t">
      © {new Date().getFullYear()} InboxTracker. All rights reserved.
    </footer>
  );
}

const HARDCODED_USER_ID = 1
const sas_token = 'sv=2022-11-02&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2025-10-11T17:59:41Z&st=2024-10-11T09:59:41Z&spr=https,http&sig=6y0SwjdB2sDHQWUNVzfrs3WsTQ2lLJ5crw9iITrefEc%3D'

export default function ExpenseDashboard({ 
  initialExpenses, 
  initialCategories, 
  actionData,
  userId 
}: { 
  initialExpenses: ExpenseWithCategoryName[], 
  initialCategories: Category[], 
  actionData: any,
  userId: number
}) {
  const [expenses, setExpenses] = useState<ExpenseWithCategoryName[]>(initialExpenses || [])
  const [categories, setCategories] = useState<Category[]>(initialCategories || [])
  const [isOpen, setIsOpen] = useState(false)
  const submit = useSubmit()

  const pieChartData = useMemo(() => {
    const data = expenses.reduce((acc, expense) => {
      if (!acc[expense.categoryName]) {
        acc[expense.categoryName] = 0
      }
      acc[expense.categoryName] += Number(expense.amount)
      return acc
    }, {} as Record<string, number>)

    return Object.entries(data).map(([name, value]) => ({ name, value }))
  }, [expenses])

  const barChartData = useMemo(() => {
    const data = expenses.reduce((acc, expense) => {
      const date = new Date(expense.expenseDate)
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[monthYear]) {
        acc[monthYear] = 0
      }
      acc[monthYear] += Number(expense.amount)
      return acc
    }, {} as Record<string, number>)

    return Object.entries(data)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [expenses])

  useEffect(() => {
    if (actionData?.newExpense) {
      setExpenses(prevExpenses => {
        const category = categories.find(cat => cat.id === actionData.newExpense.categoryId);
        const newExpenseWithCategoryName = {
          ...actionData.newExpense,
          amount: Number(actionData.newExpense.amount),
          categoryName: category ? category.name : 'Unknown Category'
        };
        const updatedExpenses = [...prevExpenses, newExpenseWithCategoryName];
        return updatedExpenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
      });
      setIsOpen(false);
    }
    if (actionData?.deletedExpenseId) {
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== actionData.deletedExpenseId));
    }
    if (actionData?.updatedExpense) {
      setExpenses(prevExpenses => prevExpenses.map(exp => 
        exp.id === actionData.updatedExpense.id ? {
          ...actionData.updatedExpense,
          categoryName: categories.find(cat => cat.id === actionData.updatedExpense.categoryId)?.name || 'Unknown Category'
        } : exp
      ));
    }
  }, [actionData, categories]);

  const deleteExpense = useCallback((id: number) => {
    submit(
      { expenseId: id.toString(), intent: 'deleteExpense' },
      { method: 'post' }
    );
    setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
  }, [submit]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Expense Management Dashboard</h1>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Add New Expense</SheetTitle>
              <SheetDescription>
                Upload a receipt, fill in the expense details, and select a category.
              </SheetDescription>
            </SheetHeader>
            <ExpenseForm categories={categories} userId={userId} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell>{expense.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.categoryName}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>${Number(expense.amount).toFixed(2)}</TableCell>
                  <TableCell>{expense.notes}</TableCell>
                  <TableCell>
                    {expense.receiptURL ? (
                      <Button variant="ghost" size="icon">
                        <a href={`${expense.receiptURL}?${sas_token}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                        <span className="sr-only">View Receipt</span>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">No receipt</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                          <SheetHeader>
                            <SheetTitle>Edit Expense</SheetTitle>
                            <SheetDescription>
                              Make changes to your expense here. Click save when you're done.
                            </SheetDescription>
                          </SheetHeader>
                          <ExpenseForm 
                            expense={expense}
                            categories={categories} 
                            onSubmit={(updatedExpense) => {
                              submit(
                                { ...updatedExpense, intent: 'updateExpense', expenseId: expense.id },
                                { method: 'post' }
                              );
                            }}
                            isEditing={true}
                            userId={userId}
                          />
                        </SheetContent>
                      </Sheet>
                      <Form method="post">
                        <input type="hidden" name="intent" value="deleteExpense" />
                        <input type="hidden" name="expenseId" value={expense.id} />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          type="submit"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.confirm("Are you sure you want to delete this expense?")) {
                              deleteExpense(expense.id);
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </Form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Footer />
    </div>
  )
}

function ExpenseForm({ 
  categories, 
  userId, 
  expense, 
  onSubmit, 
  isEditing = false 
}: { 
  categories: Category[],
  userId: number,
  expense?: Expense,
  onSubmit?: (expense: Omit<Expense, 'createdAt' | 'updatedAt'>) => void,
  isEditing?: boolean
}) {
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [companyName, setCompanyName] = useState(expense?.companyName ?? '')
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate ?? '')
  const [categoryId, setCategoryId] = useState(expense?.categoryId?.toString() ?? '')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [receiptURL, setReceiptURL] = useState<string | null>(expense?.receiptURL ?? null)
  const [isLoadingExpense, setIsLoadingExpense] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setCategoryId('')
    }
  }, [categories, isEditing])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (isEditing) {
      e.preventDefault()
      const expenseData: Partial<Expense> = {
        id: expense?.id,
        userId,
        amount: parseFloat(amount),
        description,
        companyName,
        expenseDate,
        categoryId: parseInt(categoryId),
        notes,
        receiptURL: receiptURL || undefined,
      };

      console.log("Submitting updated expense data:", expenseData);

      if (onSubmit) {
        onSubmit(expenseData as Omit<Expense, 'createdAt' | 'updatedAt'>)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileContent = reader.result as string;
        setReceiptURL(fileContent);
        setPreviewUrl(fileContent);

        if (!amount && !description && !companyName && !expenseDate && !notes && !categoryId) {
          setIsLoadingExpense(true);
          extractExpense(fileContent).then(expenseData => {
            console.log(expenseData);
            setAmount(expenseData.amount);
            setDescription(expenseData.description);
            setCompanyName(expenseData.companyName);
            setExpenseDate(expenseData.date);
            setNotes(expenseData.notes);
            setCategoryId(expenseData.category);
          }).catch(error => {
            console.error("Error extracting expense:", error);
          }).finally(() => {
            setIsLoadingExpense(false);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value)
  }

  return (
    <Form method="post" className="space-y-4 mt-4" encType="multipart/form-data" onSubmit={handleSubmit}>
      <input type="hidden" name="intent" value={isEditing ? "updateExpense" : "addExpense"} />
      <input type="hidden" name="userId" value={userId} />
      {isEditing && <input type="hidden" name="expenseId" value={expense?.id} />}
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          value={amount}
          disabled={isLoadingExpense}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount ($)"
          required
        />
      </div>
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          name="companyName"
          type="text"
          disabled={isLoadingExpense}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Enter company name"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          value={description}
          disabled={isLoadingExpense}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
          required
        />
      </div>
      <div>
        <Label htmlFor="expenseDate">Date</Label>
        <Input
          id="expenseDate"
          name="expenseDate"
          type="date"
          value={expenseDate}
          disabled={isLoadingExpense}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select name="categoryId" value={categoryId} onValueChange={handleCategoryChange} disabled={isLoadingExpense}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          disabled={isLoadingExpense}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes"
          className="h-20"
        />
      </div>
      <div>
        <Label htmlFor="receiptURL">Receipt</Label>
        <Input
          id="receiptURL"
          name="receiptURL"
          type="file"
          onChange={handleFileChange}
          disabled={isLoadingExpense}
          accept="image/*"
        />
      </div>
      {(isEditing ? receiptURL : previewUrl) && (
        <div className="mt-4">
          <Label>Receipt Preview</Label>
          <img
            src={isEditing ? `${receiptURL}?${sas_token}` : previewUrl!}
            alt="Receipt"
            className="mt-2 max-w-full h-auto rounded-md shadow-sm"
          />
        </div>
      )}
      <Button type="submit" disabled={isLoadingExpense}>
        {isLoadingExpense ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        {isEditing ? 'Update Expense' : 'Add Expense'}
      </Button>
    </Form>
  )
}
