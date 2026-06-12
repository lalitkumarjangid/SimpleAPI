import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthModal from "@/components/AuthModal";
import AppLayout from "@/layouts/AppLayout";
import AuthRequired from "@/pages/AuthRequired";
import CreateUserPage from "@/pages/CreateUserPage";
import UsersPage from "@/pages/UsersPage";
import { clearAuth, getStoredAuth, saveAuth } from "@/lib/auth";

function ProtectedRoute({ auth, children }) {
  if (!auth) return <AuthRequired />;
  return children;
}

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());

  function handleAuthSuccess({ token, user }) {
    saveAuth({ token, user });
    setAuth({ token, user });
  }

  function handleLogout() {
    clearAuth();
    setAuth(null);
  }

  return (
    <>
      <AuthModal open={!auth} onAuthSuccess={handleAuthSuccess} />

      <Routes>
        <Route
          element={<AppLayout auth={auth} onLogout={handleLogout} />}
        >
          <Route
            index
            element={
              <ProtectedRoute auth={auth}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="create"
            element={
              <ProtectedRoute auth={auth}>
                <CreateUserPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
