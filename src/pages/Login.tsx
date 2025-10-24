import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "@/components/AccountMenu";
import { AlertCircle, LogIn } from "lucide-react";
import { VRChatError } from "@/types/errors";

export function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result === "success") {
        navigate("/");
      } else if (result === "needs_2fa") {
        navigate("/verify-2fa");
      } else {
        setError("Login failed. Please check your credentials and try again.");
      }
    } catch (err) {
      if (err instanceof VRChatError) {
        setError(err.getUserMessage());
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <AccountMenu />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Logo Area */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">VRC Circle</h1>
          <p className="text-sm text-muted-foreground">
            {t("page.login.subtitle")}
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">
                {t("page.login.welcomeTitle")}
              </CardTitle>
              <CardDescription>
                {t("page.login.welcomeDescription")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("page.login.placeholderEmail")}
                  required
                  disabled={loading}
                  autoComplete="username"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("page.login.title")}</Label>
                <Input
                  ref={passwordInputRef}
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("page.login.placeholderPassword")}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-10"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  t("page.login.signingIn")
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {t("page.login.signInButton")}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Footer Notice */}
        <div className="text-center space-y-1">
          <Button
            variant="link"
            className="text-xs h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            {t("page.login.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
