import { Link, redirect, json, useActionData, Form } from "@remix-run/react"
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
    const response = await fetch(`${process.env.API_URL}/Login`, {
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
    const session = await getSession(
      request.headers.get("Cookie")
    );
    const form = await request.formData();
    const email = form.get("email") as string;
    const password = form.get("password") as string;
  
    const userId = await validateCredentials(email, password);
  
    if (userId == null) {
      session.flash("error", "Invalid username/password");
  
      // Redirect back to the login page with errors.
      return redirect("/login", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }
  
    session.set("userId", userId);
  
    // Login succeeded, send them to the home page.
    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  

export function LoginForm() {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
            <Button variant="outline" className="w-full">
              Login with Google
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
  )
}
