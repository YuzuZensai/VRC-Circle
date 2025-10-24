// TODO: Replace placeholder settings page (This is just for testing purposes)

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { developerModeStore } from "@/stores";
import { Code2 } from "lucide-react";
import { toast } from "sonner";

export function Settings() {
  const { i18n } = useTranslation();
  const [developerMode, setDeveloperMode] = useState(
    developerModeStore.getSnapshot() ?? false
  );
  const [togglingDevMode, setTogglingDevMode] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const availableLanguages = useMemo(
    () => [
      { code: "en", label: "English" },
      { code: "ja", label: "Japanese" },
      { code: "th", label: "Thai" },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    const unsubscribeDevMode = developerModeStore.subscribe((value) => {
      if (!mounted) {
        return;
      }
      setDeveloperMode(value);
    });

    developerModeStore.ensure().catch((error) => {
      console.error("Failed to load developer mode setting", error);
    });

    return () => {
      mounted = false;
      unsubscribeDevMode();
    };
  }, []);

  useEffect(() => {
    const extractLanguage = (lng?: string) => (lng ?? "en").split("-")[0];
    setSelectedLanguage(extractLanguage(i18n.language));

    const handleLanguageChanged = (lng: string) => {
      setSelectedLanguage(extractLanguage(lng));
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  const handleDeveloperModeToggle = async () => {
    setTogglingDevMode(true);
    try {
      await developerModeStore.toggle();
      toast.success(
        `Developer mode ${!developerMode ? "enabled" : "disabled"}`
      );
    } catch (error) {
      console.error("Failed to toggle developer mode", error);
      toast.error("Failed to update developer mode setting");
    } finally {
      setTogglingDevMode(false);
    }
  };

  const handleLanguageChange = async (value: string) => {
    if (value === selectedLanguage) {
      return;
    }
    setChangingLanguage(true);
    try {
      await i18n.changeLanguage(value);
      const languageName =
        availableLanguages.find((lang) => lang.code === value)?.label ?? value;
      toast.success(`Language switched to ${languageName}.`);
    } catch (error) {
      console.error("Failed to change language", error);
      toast.error("Failed to change language. Please try again.");
    } finally {
      setChangingLanguage(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure preferences and developer-focused options for VRC Circle.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Language</CardTitle>
            <CardDescription>
              Select the language you would like to use in the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedLanguage}
              onValueChange={handleLanguageChange}
              disabled={changingLanguage}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Developer Options
            </CardTitle>
            <CardDescription>
              Enable advanced features for debugging and development
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="developer-mode"
                  className="text-base font-medium"
                >
                  Developer Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Access logs, developer tools, and advanced debugging features
                </p>
              </div>
              <Button
                id="developer-mode"
                variant={developerMode ? "default" : "outline"}
                onClick={handleDeveloperModeToggle}
                disabled={togglingDevMode}
              >
                {developerMode ? "On" : "Off"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
