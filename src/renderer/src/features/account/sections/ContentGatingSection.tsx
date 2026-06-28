import type { ContentFilterKey } from "../../../../../shared/types/settings";
import { api } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Notice, Section, ToggleRow, useAction, type SectionProps } from "../ui";

const FILTER_ORDER: ContentFilterKey[] = [
  "content_sex",
  "content_adult",
  "content_violence",
  "content_gore",
  "content_horror",
];

export function ContentGatingSection({ settings, onChange }: SectionProps) {
  const { t } = useI18n();
  const { busy, error, run } = useAction();
  const active = new Set(settings.contentFilters);

  function toggle(key: ContentFilterKey, on: boolean) {
    const next = FILTER_ORDER.filter((k) => (k === key ? on : active.has(k)));
    void run(api.settings.contentFilters(next), { onOk: onChange });
  }

  return (
    <Section
      title={t("account:contentGating.title")}
      description={t("account:contentGating.description")}
    >
      {settings.contentFiltersLocked ? (
        <p className="mb-2 text-[12.5px] text-faint">{t("account:contentGating.locked")}</p>
      ) : null}
      <div className="divide-y divide-border">
        {FILTER_ORDER.map((key) => (
          <ToggleRow
            key={key}
            label={t("account:contentGating.filterLabel", {
              label: t(`account:contentGating.filters.${key}`),
            })}
            checked={active.has(key)}
            onChange={(on) => toggle(key, on)}
            disabled={busy || settings.contentFiltersLocked}
          />
        ))}
      </div>
      <Notice error={error} />
    </Section>
  );
}
