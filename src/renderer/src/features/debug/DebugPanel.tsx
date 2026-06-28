import { useState } from "react";
import { useFriends } from "../../store/social";
import { useWorlds } from "../../store/worlds";
import { useGroups } from "../../store/groups";
import { useCopied, useDebug } from "./useDebug";
import { Count, TabButton } from "./ui";
import { CacheTab } from "./tabs/CacheTab";
import { ReposTab } from "./tabs/ReposTab";
import { ThumbnailsTab } from "./tabs/ThumbnailsTab";
import { SocialTab } from "./tabs/SocialTab";
import { WorldStorePanel } from "./tabs/WorldsTab";
import { GroupStorePanel } from "./tabs/GroupsTab";
import { WsTab } from "./tabs/WebSocketTab";
import { LogsTab } from "./tabs/LogsTab";

type Tab = "cache" | "repos" | "thumbnails" | "social" | "worlds" | "groups" | "ws" | "logs";

export function DebugPanel() {
  const { cache, stats, logs, ws, repoStats, invalidate, clear, clearLogs, clearWs } = useDebug();
  const [tab, setTab] = useState<Tab>("cache");

  const friendCount = useFriends().length;
  const worldCount = useWorlds((s) => Object.keys(s.worlds).length);
  const groupCount = useGroups((s) => Object.keys(s.groups).length);
  const repoCount = repoStats.reduce((sum, r) => sum + r.count, 0);
  const [exported, exportSnapshot] = useCopied();

  function copyEverything() {
    exportSnapshot(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          platform: window.api?.platform,
          cacheStats: stats,
          repoStats,
          counts: {
            friends: friendCount,
            worlds: worldCount,
            groups: groupCount,
            ws: ws.length,
            logs: logs.length,
          },
          logs,
          ws,
        },
        null,
        2,
      ),
    );
  }

  return (
    <div className="debug flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface p-1">
        <TabButton active={tab === "cache"} onClick={() => setTab("cache")}>
          Cache <Count n={cache.length} />
        </TabButton>
        <TabButton active={tab === "repos"} onClick={() => setTab("repos")}>
          Repositories <Count n={repoCount} />
        </TabButton>
        <TabButton active={tab === "thumbnails"} onClick={() => setTab("thumbnails")}>
          Thumbnails
        </TabButton>
        <TabButton active={tab === "social"} onClick={() => setTab("social")}>
          Social <Count n={friendCount} />
        </TabButton>
        <TabButton active={tab === "worlds"} onClick={() => setTab("worlds")}>
          Worlds <Count n={worldCount} />
        </TabButton>
        <TabButton active={tab === "groups"} onClick={() => setTab("groups")}>
          Groups <Count n={groupCount} />
        </TabButton>
        <TabButton active={tab === "ws"} onClick={() => setTab("ws")}>
          WebSocket <Count n={ws.length} />
        </TabButton>
        <TabButton active={tab === "logs"} onClick={() => setTab("logs")}>
          Logs <Count n={logs.length} />
        </TabButton>
        <button
          className="ml-auto shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-accent"
          onClick={copyEverything}
          title="Copy a full diagnostic snapshot for bug reports"
        >
          {exported ? "Copied!" : "Export snapshot"}
        </button>
      </div>

      {tab === "cache" ? (
        <CacheTab cache={cache} stats={stats} onInvalidate={invalidate} onClear={clear} />
      ) : tab === "repos" ? (
        <ReposTab repos={repoStats} />
      ) : tab === "thumbnails" ? (
        <ThumbnailsTab />
      ) : tab === "social" ? (
        <SocialTab />
      ) : tab === "worlds" ? (
        <WorldStorePanel />
      ) : tab === "groups" ? (
        <GroupStorePanel />
      ) : tab === "ws" ? (
        <WsTab ws={ws} onClear={clearWs} />
      ) : (
        <LogsTab logs={logs} onClear={clearLogs} />
      )}
    </div>
  );
}
