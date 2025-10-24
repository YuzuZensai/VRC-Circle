import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { AlertCircle, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { VRChatError } from "@/types/errors";

export function Verify2FA() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { verify2FA, twoFactorMethods } = useAuth();

  const twoFactorMethod =
    twoFactorMethods.includes("totp") || twoFactorMethods.includes("otp")
      ? "totp"
      : "emailOtp";

  const isEmailOtp = twoFactorMethod === "emailOtp";
  const isTOTP = twoFactorMethod === "totp";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const verified = await verify2FA(code, twoFactorMethod);

      if (verified) {
        navigate("/");
      } else {
        setError(t("page.verify2fa.invalid"));
        setCode("");
      }
    } catch (err) {
      if (err instanceof VRChatError) {
        setError(err.getUserMessage());
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t(
            "unexpectedError",
            "An unexpected error occurred. Please try again."
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("page.verify2fa.title")}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              {isTOTP ? (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  {t("page.verify2fa.authenticator")}
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  {t("page.verify2fa.email")}
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* 2FA Card */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">
                {t("page.verify2fa.enterCode")}
              </CardTitle>
              <CardDescription>
                {isEmailOtp
                  ? t("page.verify2fa.emailInstruction")
                  : t("page.verify2fa.appInstruction")}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="code">{t("page.verify2fa.code")}</Label>
                  <span className="text-xs text-muted-foreground">
                    {code.length}/6
                  </span>
                </div>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder={t("page.verify2fa.placeholder")}
                  required
                  disabled={loading}
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono h-14"
                  autoFocus
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full h-10"
                disabled={loading || code.length !== 6}
              >
                {loading
                  ? t("page.verify2fa.verifying")
                  : t("page.verify2fa.verify")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full h-10"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                {t("page.verify2fa.back")}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {t("page.verify2fa.help")}
          </p>
        </div>
      </div>
    </div>
  );
}
