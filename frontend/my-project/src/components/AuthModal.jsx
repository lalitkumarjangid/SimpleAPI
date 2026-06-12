import { useState } from "react";
import { signIn, signUp } from "@/lib/api";
import { supabase } from "@/lib/supabase";
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

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
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

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch {
      setError("Unable to start Google sign-in. Please try again.");
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

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={loading}
          onClick={handleGoogleSignIn}
        >
          {!loading && <GoogleIcon className="size-4" />}
          {loading ? "Redirecting..." : "Continue with Google"}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

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
