import type { AccountSettings } from "../../../../../shared/types/settings";
import { useI18n } from "../../../lib/i18n";
import { Badge } from "../../../components/ui";
import { ExternalButton, Section, WEBSITE_ACCOUNT } from "../ui";

export function AgeVerificationSection({ settings }: { settings: AccountSettings }) {
  const { t } = useI18n();
  const verified = settings.ageVerified || settings.ageVerificationStatus !== "hidden";
  return (
    <Section
      title={t("account:ageVerification.title")}
      description={t("account:ageVerification.description")}
    >
      <div className="flex flex-wrap items-center gap-3">
        {verified ? (
          <Badge tone="success">
            {settings.ageVerificationStatus === "18+"
              ? t("account:ageVerification.verified18")
              : t("account:ageVerification.verified")}
          </Badge>
        ) : (
          <Badge tone="neutral">{t("account:ageVerification.notVerified")}</Badge>
        )}
        <ExternalButton href={WEBSITE_ACCOUNT}>
          {verified ? t("account:ageVerification.manage") : t("account:ageVerification.verify")}
        </ExternalButton>
      </div>
    </Section>
  );
}
