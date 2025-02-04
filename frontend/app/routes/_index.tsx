import type { MetaFunction } from "@remix-run/node";
export const meta: MetaFunction = () => {
  return [
    { title: "Expense Management" },
    { name: "description", content: "Expense Management" },
  ];
};

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import ExpenseDashboard from "~/components/expense-dashboard";
import { Button } from "~/components/ui/button";
import { Expense, Category } from '~/types'
import { getSession, destroySession } from "~/sessions";
import { requireUserId } from "~/auth.server";

// Azure Function base URL
const AZURE_FUNCTION_BASE_URL = 'https://inboxtracker.azurewebsites.net/api';
const AZURE_FUNCTION_KEY_CODE = 'code=DDcpu5KsbITe9zqwhb5SNVRg7KrcscLFlDee4VzPDy6vAzFuCh_l6w%3D%3D'

// Hardcoded UserID
const HARDCODED_USER_ID = 1;

// Updated functions to include UserID
async function getExpenses(userId: number): Promise<Expense[]> {
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/GetExpenses?${AZURE_FUNCTION_KEY_CODE}&userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch expenses');
  const expenses = await response.json();
  return expenses.map((expense: Expense) => ({
    ...expense,
    amount: parseFloat(expense.amount.toString())
  }));
}

async function getCategories(userId: number): Promise<Category[]> {
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/GetCategories?${AZURE_FUNCTION_KEY_CODE}&userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

async function createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, receiptFile?: File): Promise<Expense> {
  const formData = new FormData();
  formData.append('expense', JSON.stringify(expense));
  if (receiptFile) {
    formData.append('receipt', receiptFile);
  }

  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/CreateExpense?${AZURE_FUNCTION_KEY_CODE}&userId=${expense.userId}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add expense: ${errorText}`);
  }
  return response.json();
}

async function updateExpense(expense: Omit<Expense, 'createdAt' | 'updatedAt'>): Promise<void> {
  console.log(`Updating expense with ID: ${expense.id}, userId: ${expense.userId}`);
  console.log(`Expense data: ${JSON.stringify(expense)}`);
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/UpdateExpense?${AZURE_FUNCTION_KEY_CODE}&userId=${expense.userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update expense: ${errorText}`);
  }
}

// Add this new function near the top of the file with the other API functions
async function deleteExpense(expenseId: number, userId: number): Promise<void> {
  console.log(`Deleting expense with ID: ${expenseId}, userId: ${userId}`);
  const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/DeleteExpense?${AZURE_FUNCTION_KEY_CODE}&expenseId=${expenseId}&userId=${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete expense');
}

// Update the Expense type to include categoryName
type ExpenseWithCategoryName = Expense & { categoryName: string };

// Define a type for the loader return value
type LoaderData = {
  expenses: ExpenseWithCategoryName[];
  categories: Category[];
  userId: string;
  error?: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  
  // Fetch expenses and categories using the userId
  const expensesResponse = await fetch(`${AZURE_FUNCTION_BASE_URL}/GetExpenses?${AZURE_FUNCTION_KEY_CODE}&userId=${userId}`);
  const categoriesResponse = await fetch(`${AZURE_FUNCTION_BASE_URL}/GetCategories?${AZURE_FUNCTION_KEY_CODE}`);

  const [expenses, categories] = await Promise.all([
    expensesResponse.json(),
    categoriesResponse.json(),
  ]);

  return json<LoaderData>({ expenses, categories, userId, error: undefined });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (intent === "logout") {
    
    return redirect("/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  try {
    if (intent === "addExpense") {
      const expense = {
        userId: Number(userId), // Convert to number, will be 0 if undefined
        companyName: formData.get("companyName") as string,
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

    if (intent === "deleteExpense") {
      const expenseId = parseInt(formData.get("expenseId") as string);
      const userIdNumber = Number(userId);
      if (isNaN(userIdNumber)) {
        throw new Error("Invalid user ID");
      }
      await deleteExpense(expenseId, userIdNumber);
      return json({ deletedExpenseId: expenseId });
    }

    if (intent === "updateExpense") {
      const updatedExpense = {
        id: parseInt(formData.get("expenseId") as string),
        userId: Number(userId),
        companyName: formData.get("companyName") as string,
        amount: parseFloat(formData.get("amount") as string),
        description: formData.get("description") as string,
        expenseDate: formData.get("expenseDate") as string,
        categoryId: parseInt(formData.get("categoryId") as string),
        notes: formData.get("notes") as string,
      };
      await updateExpense(updatedExpense);
      return json({ updatedExpenseId: updatedExpense.id });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return json({ error: 'Failed to perform action' }, { status: 500 });
  }
};

export default function ExpensesRoute() {
  const { expenses, categories, error, userId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <ExpenseDashboard
        initialExpenses={expenses}
      initialCategories={categories}
      actionData={actionData}
      userId={Number(userId)}
    />
    </div>
  );
}



