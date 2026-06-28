import { useState } from "react";
import { Banner, Loader, Tabs } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { useProfile } from "./useProfile";
import { WorldsSection, FavoriteWorldsSection, WorldSearch } from "./WorldsSection";
import { DiscoverSection } from "./DiscoverSection";

const SHELL = "mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-12 pb-16 pt-10";

type Tab = "discover" | "worlds" | "favorites";

export function MyWorldsView() {
  const t = useT();
  const state = useProfile("me");
  const [tab, setTab] = useState<Tab>("discover");

  if (state.status === "loading") return <Loader className="absolute inset-0" />;
  if (state.status === "error")
    return (
      <div className={SHELL}>
        <Banner>{state.message}</Banner>
      </div>
    );

  const userId = state.profile.id;
  return (
    <div className={SHELL}>
      <header>
        <h1 className="text-[26px] font-bold tracking-[-0.4px]">{t("nav:worlds")}</h1>
      </header>

      <Tabs
        tabs={[
          { id: "discover", label: t("profile:tabs.discover") },
          { id: "worlds", label: t("profile:tabs.worlds") },
          { id: "favorites", label: t("profile:tabs.favorites") },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "discover" ? (
        <div className="rise-in">
          <DiscoverSection />
        </div>
      ) : tab === "worlds" ? (
        <div className="rise-in">
          <WorldSearch>{(filter) => <WorldsSection userId={userId} filter={filter} />}</WorldSearch>
        </div>
      ) : (
        <div className="rise-in">
          <WorldSearch>
            {(filter) => <FavoriteWorldsSection userId={userId} filter={filter} />}
          </WorldSearch>
        </div>
      )}
    </div>
  );
}
