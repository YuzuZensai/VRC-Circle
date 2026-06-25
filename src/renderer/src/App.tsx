import { useAuth } from "./features/auth/AuthContext";
import { LoginScreen } from "./features/auth/LoginScreen";
import { AppShell } from "./components/AppShell";
import { Loader } from "./components/ui";

export function App() {
  const { status, loading, adding } = useAuth();

  if (loading) return <Loader />;

  const authed = status.state === "authenticated";
  return authed && !adding ? <AppShell /> : <LoginScreen />;
}
