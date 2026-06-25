import type { AccountSettings } from "../../../../../shared/types/settings";
import { useI18n } from "../../../lib/i18n";
import { Badge } from "../../../components/ui";
import { ExternalButton, Section, WEBSITE_ACCOUNT } from "../ui";

export function AccountLinksSection({ settings }: { settings: AccountSettings }) {
  const { t } = useI18n();
  return (
    <Section
      title={t("account:linkedAccounts.title")}
      description={t("account:linkedAccounts.description")}
    >
      <div className="flex flex-col gap-2.5">
        <LinkRow name="Discord" link={settings.discord} />
        <LinkRow name="Google" link={settings.google} />
      </div>
      <div className="mt-4">
        <ExternalButton href={WEBSITE_ACCOUNT}>{t("account:linkedAccounts.manage")}</ExternalButton>
      </div>
    </Section>
  );
}

function LinkRow({ name, link }: { name: string; link: AccountSettings["discord"] }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3">
      <div>
        <div className="text-[13.5px] font-semibold">{name}</div>
        {link.linked && link.label ? (
          <div className="text-[12px] text-muted">{link.label}</div>
        ) : null}
      </div>
      {link.linked ? (
        <Badge tone="success">{t("account:linkedAccounts.linked")}</Badge>
      ) : (
        <Badge tone="neutral">{t("account:linkedAccounts.notLinked")}</Badge>
      )}
    </div>
  );
}
