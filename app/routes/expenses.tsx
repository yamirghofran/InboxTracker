import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import ExpenseDashboard from "~/components/expense-dashboard";
import { Expense, Category } from '~/types'

// Azure Function base URL
const AZURE_FUNCTION_BASE_URL = 'https://inboxtracker.azurewebsites.net/api';
const AZURE_FUNCTION_KEY_CODE = 'code=DDcpu5KsbITe9zqwhb5SNVRg7KrcscLFlDee4VzPDy6vAzFuCh_l6w%3D%3D'

// Hardcoded UserID
const HARDCODED_USER_ID = 1;

// Updated functions to include UserID
async function getExpenses(): Promise<Expense[]> {
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/GetExpenses?${AZURE_FUNCTION_KEY_CODE}&userId=${HARDCODED_USER_ID}`);
  if (!response.ok) throw new Error('Failed to fetch expenses');
  const expenses = await response.json();
  return expenses.map((expense: Expense) => ({
    ...expense,
    amount: parseFloat(expense.amount.toString())
  }));
}

async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/GetCategories?${AZURE_FUNCTION_KEY_CODE}&userId=${HARDCODED_USER_ID}`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

async function createExpense(expense: Omit<Expense, 'id'>, receiptFile?: File): Promise<Expense> {
  const formData = new FormData();
  formData.append('expense', JSON.stringify(expense));
  if (receiptFile) {
    formData.append('receipt', receiptFile, receiptFile.name);
  }

  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/CreateExpense?${AZURE_FUNCTION_KEY_CODE}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add expense: ${errorText}`);
  }
  return response.json();
}

async function addCategory(name: string): Promise<Category> {
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/AddCategory${AZURE_FUNCTION_KEY_CODE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Failed to add category');
  return response.json();
}

// Add this new function near the top of the file with the other API functions
async function deleteExpense(expenseId: number): Promise<void> {
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/DeleteExpense?${AZURE_FUNCTION_KEY_CODE}&expenseId=${expenseId}&userId=${HARDCODED_USER_ID}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to delete expense');
}

// Update the Expense type to include categoryName
type ExpenseWithCategoryName = Expense & { categoryName: string };

// Define a type for the loader return value
type LoaderData = {
  expenses: ExpenseWithCategoryName[];
  categories: Category[];
  error?: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const [expenses, categories] = await Promise.all([getExpenses(), getCategories()]);
    
    // Join expenses with categories to include category names
    const expensesWithCategoryNames: ExpenseWithCategoryName[] = expenses.map(expense => {
      const category = categories.find(cat => cat.id === expense.categoryId);
      return {
        ...expense,
        categoryName: category ? category.name : 'Unknown Category'
      };
    });

    return json<LoaderData>({ expenses: expensesWithCategoryNames, categories });
  } catch (error) {
    console.error('Loader error:', error);
    return json<LoaderData>({ expenses: [], categories: [], error: 'Failed to load data' }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "addExpense") {
      const expense = {
        userId: parseInt(formData.get("userId") as string),
        amount: parseFloat(formData.get("amount") as string),
        description: formData.get("description") as string,
        expenseDate: formData.get("expenseDate") as string,
        categoryId: parseInt(formData.get("categoryId") as string),
        notes: formData.get("notes") as string,
      };
      const receiptFile = formData.get("receiptURL") as File | null;
      const newExpense = await createExpense(expense, receiptFile || undefined);
      return json({ newExpense });
    }

    if (intent === "addCategory") {
      const categoryName = formData.get("categoryName") as string;
      const newCategory = await addCategory(categoryName);
      return json({ newCategory });
    }

    if (intent === "deleteExpense") {
      const expenseId = parseInt(formData.get("expenseId") as string);
      await deleteExpense(expenseId);
      return json({ deletedExpenseId: expenseId });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return json({ error: 'Failed to perform action' }, { status: 500 });
  }
};

export default function ExpensesRoute() {
  const { expenses, categories, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <ExpenseDashboard
      initialExpenses={expenses}
      initialCategories={categories}
      actionData={actionData}
      userId={HARDCODED_USER_ID}
    />
  );
}