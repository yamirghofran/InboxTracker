import { Link, redirect, json, useActionData, Form, useNavigate } from "@remix-run/react"
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node"
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
import { getSession, commitSession } from "~/sessions"

// Azure Function base URL
const AZURE_FUNCTION_BASE_URL = 'https://inboxtracker.azurewebsites.net/api';
const AZURE_FUNCTION_KEY_CODE = 'code=DDcpu5KsbITe9zqwhb5SNVRg7KrcscLFlDee4VzPDy6vAzFuCh_l6w%3D%3D'

// Hardcoded UserID
const HARDCODED_USER_ID = 1;

type ActionData = {
    error?: string;
  };

export async function loader({
    request,
  }: LoaderFunctionArgs) {
    const session = await getSession(
      request.headers.get("Cookie")
    );
  
    if (session.has("userId")) {
      // Redirect to the home page if they are already signed in.
      return redirect("/");
    }
  
    const data = { error: session.get("error") };
  
    return json(data, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  async function validateCredentials(email: string, password: string) {
    const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/Login?${AZURE_FUNCTION_KEY_CODE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.id;
    }
    return null;
  }

  export async function action({
    request,
  }: ActionFunctionArgs): Promise<Response | ActionData> {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");

    // Perform login logic here (e.g., call your Azure Function)
    const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/Login?${AZURE_FUNCTION_KEY_CODE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const { id: userId } = await response.json();
      const session = await getSession(request.headers.get("Cookie"));
      session.set("userId", userId);

      return redirect("/", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    } else {
      return json({ error: "Invalid credentials" }, { status: 400 });
    }
  }
  

export default function LoginForm() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="h-screen flex">
  {/* Left side: Form (25% width) */}
  <div className="w-1/4 flex flex-col">
    <Form method="post" className="w-full h-full flex items-center justify-center">
      <Card className="mx-auto w-11/12 max-w-md h-2/5 flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" name="password" placeholder="1234" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </div>
          {actionData?.error && (
            <p className="mt-4 text-red-600">{actionData.error}</p>
          )}
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </Form>
    
  {/* Footer */}
  <footer className="py-4 text-center text-sm text-gray-500">
          © 2024 InboxTracker. All rights reserved.
        </footer>
      </div>

  {/* Right side: Image (75% width) */}
  <div className="w-3/4">
    <img
      src="https://d4ywmces95mzh.cloudfront.net/office.jpg"
      alt="Corporate Illustration"
      className="h-full w-full object-cover"
    />
  </div>
</div>

  )
}
