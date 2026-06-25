import { useState } from "react";
import { Trans } from "react-i18next";
import { useI18n } from "../../lib/i18n";
import { Banner, Loader, Tabs } from "../../components/ui";
import { useAccountSettings } from "./useAccountSettings";
import { DisplayNameSection } from "./sections/DisplayNameSection";
import { EmailSection } from "./sections/EmailSection";
import { PasswordSection } from "./sections/PasswordSection";
import { AccountLinksSection } from "./sections/AccountLinksSection";
import { TwoFactorSection } from "./sections/TwoFactorSection";
import { AgeVerificationSection } from "./sections/AgeVerificationSection";
import { PrivacySection } from "./sections/PrivacySection";
import { ContentGatingSection } from "./sections/ContentGatingSection";
import { UserDataSection } from "./sections/UserDataSection";
import { DangerZoneSection } from "./sections/DangerZoneSection";

const SHELL = "mx-auto flex w-full max-w-[760px] flex-col gap-[18px] px-12 pb-16 pt-10";
const SECTIONS = "animate-rise flex flex-col gap-[18px]";

type AccountTab = "account" | "security" | "privacy" | "data";

export function AccountSettingsView() {
  const { t } = useI18n();
  const { state, set } = useAccountSettings();
  const [tab, setTab] = useState<AccountTab>("account");

  if (state.status === "loading") return <Loader className="absolute inset-0" />;
  if (state.status === "error")
    return (
      <div className={SHELL}>
        <Banner>{state.message}</Banner>
      </div>
    );

  const s = state.settings;
  return (
    <div className={SHELL}>
      <header>
        <h1 className="text-[26px] font-bold tracking-[-0.4px]">{t("account:title")}</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          <Trans
            i18nKey="account:subtitle"
            values={{ name: s.displayName }}
            components={[<span className="font-semibold text-text" />]}
          />
        </p>
      </header>

      <Tabs
        tabs={[
          { id: "account", label: t("account:tabs.account") },
          { id: "security", label: t("account:tabs.security") },
          { id: "privacy", label: t("account:tabs.privacy") },
          { id: "data", label: t("account:tabs.data") },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "account" ? (
        <div className={SECTIONS}>
          <DisplayNameSection settings={s} onChange={set} />
          <EmailSection settings={s} onChange={set} />
          <PasswordSection settings={s} onChange={set} />
          <AccountLinksSection settings={s} />
        </div>
      ) : null}

      {tab === "security" ? (
        <div className={SECTIONS}>
          <TwoFactorSection settings={s} onChange={set} />
          <AgeVerificationSection settings={s} />
        </div>
      ) : null}

      {tab === "privacy" ? (
        <div className={SECTIONS}>
          <PrivacySection settings={s} onChange={set} />
          <ContentGatingSection settings={s} onChange={set} />
        </div>
      ) : null}

      {tab === "data" ? (
        <div className={SECTIONS}>
          <UserDataSection />
          <DangerZoneSection settings={s} onChange={set} />
        </div>
      ) : null}
    </div>
  );
}
