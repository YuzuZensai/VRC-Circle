import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";

export function LoginRequired() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="border-dashed">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {t("component.loginRequired.title")}
            </CardTitle>
            {/* <CardDescription>
            </CardDescription> */}
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("component.loginRequired.bottomText")}
            </p>
            <Button onClick={() => navigate("/login")} size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              {t("component.loginRequired.signIn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
