export type Expense = {
    id: number
    userId: number
    categoryId: number
    amount: number // Assuming TypeScript handles decimals as numbers
    description: string
    notes?: string
    receiptURL?: string
    expenseDate: string // Assuming date is represented as a string
    createdAt: string
    companyName?: string
    updatedAt: string
    reimbursedAt?: string
    reimbursedStatus?: 'pending' | 'approved' | 'rejected'
    reimbursedBy?: number
}

export type ExpenseWithCategoryName = Expense & { categoryName: string };

export type Category = {
  id: number
  name: string,
  updatedAt: string
}

export type User = {
    id: number
    username: string
    passwordHash: string
    email: string
    createdAt: string
    department: string
    lastName: string
    firstName: string
    userType: 'admin' | 'employee'
    updatedAt: string
    lastLoginTime: string
}
