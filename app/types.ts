export type Expense = {
    id: number
    userId: number,
    categoryId: number,
    amount: number
    description: string
    expenseDate: string
    notes: string
    receiptURL?: string
  }

export type ExpenseWithCategoryName = Expense & { categoryName: string };

export type Category = {
  id: number
  name: string
}