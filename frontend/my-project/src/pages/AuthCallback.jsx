import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthCallback({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    async function completeSignIn(session) {
      if (handled.current || !session?.access_token) return;

      handled.current = true;

      try {
        const data = await signInWithGoogle(session.access_token);
        onAuthSuccess(data);
        navigate("/", { replace: true });
      } catch (err) {
        handled.current = false;
        setError(
          err.response?.data?.message || "Google sign-in failed. Please try again.",
        );
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) completeSignIn(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") completeSignIn(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate, onAuthSuccess]);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <p className="text-muted-foreground">Completing Google sign-in...</p>
        )}
      </div>
    </div>
  );
}
