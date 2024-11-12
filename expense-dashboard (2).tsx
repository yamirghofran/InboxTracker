'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Pencil, Trash } from "lucide-react"
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts'
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const expenses = [
  {
    id: "EXP001",
    title: "Office Supplies",
    issuer: "Staples",
    label: "Office",
    date: "2023-06-15",
    amount: 250.00,
    notes: "Quarterly stock up on office essentials",
    receipt: true,
  },
  {
    id: "EXP002",
    title: "Team Lunch",
    issuer: "Local Bistro",
    label: "Meals",
    date: "2023-06-18",
    amount: 180.50,
    notes: "Monthly team building lunch",
    receipt: true,
  },
  {
    id: "EXP003",
    title: "Software Subscription",
    issuer: "Adobe",
    label: "Software",
    date: "2023-07-20",
    amount: 599.99,
    notes: "Annual subscription for Creative Cloud",
    receipt: false,
  },
  {
    id: "EXP004",
    title: "Client Meeting",
    issuer: "Uber",
    label: "Travel",
    date: "2023-07-22",
    amount: 45.00,
    notes: "Transportation to client office",
    receipt: true,
  },
  {
    id: "EXP005",
    title: "Conference Ticket",
    issuer: "TechConf",
    label: "Professional Development",
    date: "2023-08-25",
    amount: 899.00,
    notes: "Ticket for annual tech conference",
    receipt: true,
  },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function ExpenseDashboard() {
  const [expenseList, setExpenseList] = useState(expenses)

  const handleDelete = (id: string) => {
    setExpenseList(expenseList.filter(expense => expense.id !== id))
  }

  const handleEdit = (id: string) => {
    // Implement edit functionality
    console.log(`Edit expense with id: ${id}`)
  }

  const pieChartData = useMemo(() => {
    const data = expenseList.reduce((acc, expense) => {
      if (!acc[expense.label]) {
        acc[expense.label] = 0
      }
      acc[expense.label] += expense.amount
      return acc
    }, {} as Record<string, number>)

    return Object.entries(data).map(([name, value]) => ({ name, value }))
  }, [expenseList])

  const barChartData = useMemo(() => {
    const data = expenseList.reduce((acc, expense) => {
      const date = new Date(expense.date)
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[monthYear]) {
        acc[monthYear] = 0
      }
      acc[monthYear] += expense.amount
      return acc
    }, {} as Record<string, number>)

    return Object.entries(data)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [expenseList])

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <CardHeader>
          <CardTitle>Expense List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of your recent expenses.</TableCaption>
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
              {expenseList.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.title}</TableCell>
                  <TableCell>{expense.issuer}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.label}</Badge>
                  </TableCell>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>${expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{expense.notes}</TableCell>
                  <TableCell>
                    {expense.receipt ? (
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Receipt</span>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">No receipt</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense.id)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}