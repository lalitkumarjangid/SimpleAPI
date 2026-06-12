import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  companyName: "",
  phone: "",
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

function validateForm(form) {
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (!form.email.trim()) return "Email is required.";
  if (!isValidEmail(form.email.trim())) return "Enter a valid email address.";
  if (!form.companyName.trim()) return "Company name is required.";
  if (!form.phone.trim()) return "Phone number is required.";
  if (!/^\d+$/.test(form.phone.trim())) return "Phone must contain only digits.";
  return "";
}

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isValid = validateForm(form) === "";

  function updateField(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setError("");
      setSuccess("");
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await createUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        companyName: form.companyName.trim(),
        phone: Number(form.phone.trim()),
      });

      setSuccess("Contact created successfully.");
      setForm(emptyForm);

      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create contact.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Add contact</CardTitle>
        <CardDescription>
          Create a new contact and save it to your account.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredLabel htmlFor="firstName">First name</RequiredLabel>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={updateField("firstName")}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="lastName">Last name</RequiredLabel>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={updateField("lastName")}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel htmlFor="email">Email</RequiredLabel>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={updateField("email")}
              placeholder="john@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <RequiredLabel htmlFor="companyName">Company</RequiredLabel>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={updateField("companyName")}
              placeholder="Acme Inc"
              required
            />
          </div>

          <div className="space-y-2">
            <RequiredLabel htmlFor="phone">Phone</RequiredLabel>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={updateField("phone")}
              placeholder="9876543210"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t bg-transparent sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link to="/">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading || !isValid}>
            {loading ? "Saving..." : "Create contact"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
