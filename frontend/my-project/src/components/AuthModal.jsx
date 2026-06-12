import { useState } from "react";
import { signIn, signUp } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

function RequiredLabel({ htmlFor, children }) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      <span className="text-destructive" aria-hidden="true">
        {" "}
        *
      </span>
    </Label>
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignIn({ email, password }) {
  if (!email.trim()) return "Email is required.";
  if (!isValidEmail(email.trim())) return "Enter a valid email address.";
  if (!password) return "Password is required.";
  return "";
}

function validateSignUp({ firstName, lastName, email, password }) {
  if (!firstName.trim()) return "First name is required.";
  if (!lastName.trim()) return "Last name is required.";
  if (!email.trim()) return "Email is required.";
  if (!isValidEmail(email.trim())) return "Enter a valid email address.";
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return "";
}

export default function AuthModal({ open, onAuthSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState(emptyForm);

  const signInValid =
    signInForm.email.trim() !== "" &&
    isValidEmail(signInForm.email.trim()) &&
    signInForm.password !== "";

  const signUpValid =
    signUpForm.firstName.trim() !== "" &&
    signUpForm.lastName.trim() !== "" &&
    signUpForm.email.trim() !== "" &&
    isValidEmail(signUpForm.email.trim()) &&
    signUpForm.password.length >= 6;

  async function handleSignIn(e) {
    e.preventDefault();
    setError("");

    const validationError = validateSignIn(signInForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const data = await signIn({
        email: signInForm.email.trim(),
        password: signInForm.password,
      });
      onAuthSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError("");

    const validationError = validateSignUp(signUpForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const data = await signUp({
        firstName: signUpForm.firstName.trim(),
        lastName: signUpForm.lastName.trim(),
        email: signUpForm.email.trim(),
        password: signUpForm.password,
      });
      onAuthSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Authentication required</DialogTitle>
          <DialogDescription>
            Sign in or create an account to manage your contacts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full" onValueChange={() => setError("")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="signin" className="mt-4">
            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              <div className="space-y-2">
                <RequiredLabel htmlFor="signin-email">Email</RequiredLabel>
                <Input
                  id="signin-email"
                  type="email"
                  value={signInForm.email}
                  onChange={(e) =>
                    setSignInForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="signin-password">Password</RequiredLabel>
                <Input
                  id="signin-password"
                  type="password"
                  value={signInForm.password}
                  onChange={(e) =>
                    setSignInForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  required
                  aria-required="true"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !signInValid}>
                {loading ? "Please wait..." : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <form onSubmit={handleSignUp} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <RequiredLabel htmlFor="firstName">First name</RequiredLabel>
                  <Input
                    id="firstName"
                    value={signUpForm.firstName}
                    onChange={(e) =>
                      setSignUpForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="John"
                    required
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="lastName">Last name</RequiredLabel>
                  <Input
                    id="lastName"
                    value={signUpForm.lastName}
                    onChange={(e) =>
                      setSignUpForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="Doe"
                    required
                    aria-required="true"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="signup-email">Email</RequiredLabel>
                <Input
                  id="signup-email"
                  type="email"
                  value={signUpForm.email}
                  onChange={(e) =>
                    setSignUpForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="signup-password">Password</RequiredLabel>
                <Input
                  id="signup-password"
                  type="password"
                  value={signUpForm.password}
                  onChange={(e) =>
                    setSignUpForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  minLength={6}
                  required
                  aria-required="true"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters required.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !signUpValid}>
                {loading ? "Please wait..." : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
