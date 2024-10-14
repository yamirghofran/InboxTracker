import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from "~/components/ui/button"
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
import { PencilIcon, TrashIcon } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Form, useSubmit, useNavigation } from "@remix-run/react"
import { format } from 'date-fns'
import { ExpenseWithCategoryName, Category, Expense } from '~/types'
const HARDCODED_USER_ID = 1
const sas_token = 'sv=2022-11-02&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2025-10-11T17:59:41Z&st=2024-10-11T09:59:41Z&spr=https,http&sig=6y0SwjdB2sDHQWUNVzfrs3WsTQ2lLJ5crw9iITrefEc%3D'


const ExpenseCard = ({ expense, onDelete }: { expense: ExpenseWithCategoryName; onDelete: (id: number) => void }) => {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isDeleting = navigation.formData?.get("intent") === "deleteExpense" && 
                     navigation.formData?.get("expenseId") === expense.id.toString();

  const handleDelete = useCallback(() => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      onDelete(expense.id);
    }
  }, [expense.id, onDelete]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="relative pb-2">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-semibold">{expense.description}</h2>
          <span className="text-lg font-semibold">${expense.amount?.toFixed(2) ?? 'N/A'}</span>
        </div>
        <Badge variant="secondary" className="mt-2 max-w-fit">
          {expense.categoryName ?? 'Uncategorized'}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mt-2">
          {expense.notes ?? 'N/A'}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
      {expense.receiptURL && (
        <div className="mt-2">
          <span className="font-medium text-gray-700">Receipt:</span>
          <a 
            href={`${expense.receiptURL}?${sas_token}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-500 hover:underline ml-1"
          >
            View Receipt
          </a>
          </div>
        )} 
        <span className="text-sm text-muted-foreground">
          {expense.expenseDate ? format(new Date(expense.expenseDate), 'MMM d, yyyy') : 'N/A'}
        </span>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon">
            <PencilIcon className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Form method="post">
            <input type="hidden" name="intent" value="deleteExpense" />
            <input type="hidden" name="expenseId" value={expense.id} />
            <Button 
              variant="ghost" 
              size="icon" 
              type="submit"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              <TrashIcon className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </Form>
        </div>
      </CardFooter>
    </Card>
  )
}


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

  useEffect(() => {
    if (actionData?.newExpense) {
      setExpenses(prevExpenses => {
        const category = categories.find(cat => cat.id === actionData.newExpense.categoryId);
        const newExpenseWithCategoryName = {
          ...actionData.newExpense,
          categoryName: category ? category.name : 'Unknown Category'
        };
        const updatedExpenses = [...prevExpenses, newExpenseWithCategoryName];
        // Sort expenses by date in descending order
        return updatedExpenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
      });
      setIsOpen(false);
    }
    if (actionData?.newCategory) {
      setCategories(prevCategories => [...prevCategories, actionData.newCategory]);
    }
    if (actionData?.deletedExpenseId) {
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== actionData.deletedExpenseId));
    }
  }, [actionData, categories]); // Ensure categories is included in the dependency array

  const addCategory = (name: string) => {
    submit(
      { categoryName: name, intent: 'addCategory' },
      { method: 'post' }
    )
  }

  const deleteExpense = useCallback((id: number) => {
    // Trigger the form submission
    submit(
      { expenseId: id.toString(), intent: 'deleteExpense' },
      { method: 'post' }
    );

    // Optimistically update the state
    setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
  }, [submit]);

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-6">Expense Management Dashboard</h1>
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button className="mb-4">
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
          <ExpenseForm categories={categories} onAddCategory={addCategory} userId={userId} />
        </SheetContent>
      </Sheet>

      <div className="grid gap-4">
        {expenses && expenses.length > 0 ? (
          expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} onDelete={deleteExpense} />
          ))
        ) : (
          <p>No expenses to display.</p>
        )}
      </div>
    </div>
  )
}

function ExpenseForm({ categories, onAddCategory, userId }: { 
  categories: Category[],
  onAddCategory: (name: string) => void,
  userId: number
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptURL, setReceiptURL] = useState<string | null>(null)
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    setCategoryId('')
  }, [categories])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // onSubmit({
    //   amount: parseFloat(amount),
    //   description,
    //   expenseDate,
    //   categoryId: parseInt(categoryId),
    //   notes,
    //   receiptURL: receiptURL || undefined,
    // })
    setAmount('')
    setDescription('')
    setCompanyName('')
    setExpenseDate('')
    setCategoryId('')
    setNotes('')
    setReceiptURL(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptURL(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddCategory = () => {
    if (newCategoryName) {
      onAddCategory(newCategoryName)
      setNewCategoryName('')
      setIsNewCategoryDialogOpen(false)
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setIsNewCategoryDialogOpen(true)
    } else {
      setCategoryId(value)
    }
  }

  return (
    <Form method="post" className="space-y-4 mt-4" encType="multipart/form-data">
      <input type="hidden" name="intent" value="addExpense" />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="companyName" value={companyName} />
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          required
        />
      </div>
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          name="companyName"
          type="text"
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
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select name="categoryId" value={categoryId} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
            <SelectItem value="new">
              <span className="text-blue-500">+ Add new category</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
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
          accept="image/*"
        />
      </div>
      <Button type="submit">Add Expense</Button>

      <Dialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-category" className="text-right">
                Name
              </Label>
              <Input
                id="new-category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <Button onClick={handleAddCategory}>Add Category</Button>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
