import { useState } from "react"
import { Link, useNavigate } from "@remix-run/react"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

// Azure Function base URL
const AZURE_FUNCTION_BASE_URL = 'https://inboxtracker.azurewebsites.net/api';
const AZURE_FUNCTION_KEY_CODE = 'code=DDcpu5KsbITe9zqwhb5SNVRg7KrcscLFlDee4VzPDy6vAzFuCh_l6w%3D%3D'

// Hardcoded UserID
const HARDCODED_USER_ID = 1;

export const description =
  "A sign up form with first name, last name, email and password inside a card. There's an option to sign up with GitHub and a link to login if you already have an account"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/Signup?${AZURE_FUNCTION_KEY_CODE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        // Handle successful signup (e.g., store user data in session, redirect)
        console.log("Signup successful", data)
        navigate("/login") // Redirect to dashboard or home page
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Signup failed. Please try again.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("Signup error:", err)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Create an account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}