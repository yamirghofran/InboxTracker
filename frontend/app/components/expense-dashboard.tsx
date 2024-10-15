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
import { PencilIcon, TrashIcon, Loader2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Form, useSubmit, useNavigation } from "@remix-run/react"
import { format } from 'date-fns'
import { ExpenseWithCategoryName, Category, Expense } from '~/types'
import { extractExpense } from '~/util';
const HARDCODED_USER_ID = 1
const sas_token = 'sv=2022-11-02&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2025-10-11T17:59:41Z&st=2024-10-11T09:59:41Z&spr=https,http&sig=6y0SwjdB2sDHQWUNVzfrs3WsTQ2lLJ5crw9iITrefEc%3D'


const ExpenseCard = ({ expense, onDelete, categories, userId }: { expense: ExpenseWithCategoryName; onDelete: (id: number) => void; categories: Category[]; userId: number }) => {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isDeleting = navigation.formData?.get("intent") === "deleteExpense" && 
                     navigation.formData?.get("expenseId") === expense.id.toString();

  const [isEditing, setIsEditing] = useState(false);
  const [editedExpense, setEditedExpense] = useState(expense);

  const handleDelete = useCallback(() => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      onDelete(expense.id);
    }
  }, [expense.id, onDelete]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditSubmit = useCallback((updatedExpense: Omit<Expense, "createdAt" | "updatedAt">) => {
    console.log("Updating expense:", updatedExpense);

    const updatedExpenseWithCategory: ExpenseWithCategoryName = {
      ...updatedExpense,
      categoryName: categories.find(cat => cat.id === updatedExpense.categoryId)?.name || 'Unknown Category',
      createdAt: expense.createdAt,
      updatedAt: new Date().toISOString()
    };

    setEditedExpense(updatedExpenseWithCategory);

    submit(
      { ...updatedExpense, intent: 'updateExpense', expenseId: expense.id },
      { method: 'post' }
    );
    setIsEditing(false);
  }, [submit, expense.id, categories, expense.createdAt]);

  // Use editedExpense for rendering
  const displayExpense = editedExpense;

  // Helper function to format the amount
  const formatAmount = (amount: any) => {
    if (typeof amount === 'number') {
      return amount.toFixed(2);
    } else if (typeof amount === 'string') {
      const parsedAmount = parseFloat(amount);
      return isNaN(parsedAmount) ? 'N/A' : parsedAmount.toFixed(2);
    }
    return 'N/A';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="relative pb-2">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-semibold">{displayExpense.description} - {displayExpense.companyName}</h2>
          <span className="text-lg font-semibold">${formatAmount(displayExpense.amount)}</span>
        </div>
        <Badge variant="secondary" className="mt-2 max-w-fit">
          {displayExpense.categoryName ?? 'Uncategorized'}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mt-2">
          {displayExpense.notes ?? 'N/A'}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        {displayExpense.receiptURL && (
          <div className="mt-2">
            <span className="font-medium text-gray-700">Receipt:</span>
            <a 
              href={`${displayExpense.receiptURL}?${sas_token}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:underline ml-1"
            >
              View Receipt
            </a>
          </div>
        )} 
        <span className="text-sm text-muted-foreground">
          {displayExpense.expenseDate ? format(new Date(displayExpense.expenseDate), 'MMM d, yyyy') : 'N/A'}
        </span>
        <div className="flex space-x-2">
          <Sheet open={isEditing} onOpenChange={setIsEditing}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleEdit}>
                <PencilIcon className="h-4 w-4" />
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
                expense={expense} // Pass the full expense object
                categories={categories} 
                onSubmit={handleEditSubmit} 
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
  }, [actionData, categories]); // Ensure categories is included in the dependency array

  

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
      <Form method="post">
        <input type="hidden" name="intent" value="logout" />
        <Button variant="outline" type="submit">Log out</Button>
      </Form>
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
        <ExpenseForm categories={categories} userId={userId} />
        </SheetContent>
      </Sheet>

      <div className="grid gap-4">
        {expenses && expenses.length > 0 ? (
          expenses.map((expense) => (
            <ExpenseCard 
              key={expense.id} 
              expense={expense} 
              onDelete={deleteExpense} 
              categories={categories}
              userId={userId}
            />
          ))
        ) : (
          <p>No expenses to display.</p>
        )}
      </div>
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
    // For new expenses, we'll let the form submit normally
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileContent = reader.result as string;
        setReceiptURL(fileContent);

        // Only process if fields are empty
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
      {isEditing && receiptURL && (
        <div className="mt-4">
          <Label>Receipt Preview</Label>
          <img
            src={`${receiptURL}?${sas_token}`}
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