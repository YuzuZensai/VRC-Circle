import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Trash2, RefreshCw, Search, X } from "lucide-react";
import { logger, LogEntry as FrontendLogEntry, LogLevel } from "@/utils/logger";
import { LogsService, CombinedLogEntry } from "@/services/logs";
import { toast } from "sonner";

type LogSource = "all" | "frontend" | "backend";
type LogLevelFilter = "all" | LogLevel;

export function Logs() {
  const { t } = useTranslation();
  const [frontendLogs, setFrontendLogs] = useState<FrontendLogEntry[]>([]);
  const [backendLogs, setBackendLogs] = useState<CombinedLogEntry[]>([]);
  const [sourceFilter, setSourceFilter] = useState<LogSource>("all");
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Load frontend logs from logger
    setFrontendLogs(logger.getLogs());

    // Subscribe to new frontend logs
    const unsubscribe = logger.subscribe((entry) => {
      setFrontendLogs((prev) => [...prev, entry]);
    });

    // Load backend logs
    loadBackendLogs();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadBackendLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadBackendLogs = async () => {
    try {
      const logs = await LogsService.getBackendLogs();
      setBackendLogs(logs);
    } catch (error) {
      console.error("Failed to load backend logs:", error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadBackendLogs();
      setFrontendLogs(logger.getLogs());
      toast.success(t("component.developerTools.logger.toasts.refreshed"));
    } catch (error) {
      toast.error(t("component.developerTools.logger.toasts.refreshFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(t("component.developerTools.logger.confirm.clearAll"))) {
      return;
    }

    setLoading(true);
    try {
      logger.clearLogs();
      await LogsService.clearBackendLogs();
      setFrontendLogs([]);
      setBackendLogs([]);
      toast.success(t("component.developerTools.logger.toasts.cleared"));
    } catch (error) {
      toast.error(t("component.developerTools.logger.toasts.clearFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const allLogs = [...frontendLogs, ...backendLogs].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const exportData = JSON.stringify(allLogs, null, 2);
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vrc-circle-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t("component.developerTools.logger.toasts.exported"));
    } catch (error) {
      toast.error(t("component.developerTools.logger.toasts.exportFailed"));
    } finally {
      setLoading(false);
    }
  };

  const combinedLogs = useMemo(() => {
    const all: CombinedLogEntry[] = [...frontendLogs, ...backendLogs];

    // Apply filters
    let filtered = all;

    if (sourceFilter !== "all") {
      filtered = filtered.filter((log) => log.source === sourceFilter);
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter(
        (log) => log.level.toLowerCase() === levelFilter
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.module.toLowerCase().includes(query)
      );
    }

    // Sort by timestamp (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [frontendLogs, backendLogs, sourceFilter, levelFilter, searchQuery]);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "warn":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "info":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "debug":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getSourceColor = (source: string) => {
    return source === "frontend"
      ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
      : "bg-orange-500/10 text-orange-500 border-orange-500/20";
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {t("component.developerTools.logger.title")}
            </h2>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              {t("component.developerTools.logger.sidebar.refresh")}
            </Button>

            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="w-full"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
              />
              {t("component.developerTools.logger.sidebar.autoRefresh")}
            </Button>

            <Button
              onClick={handleExport}
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("component.developerTools.logger.sidebar.export")}
            </Button>

            <Button
              onClick={handleClearAll}
              disabled={loading}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("component.developerTools.logger.sidebar.clearAll")}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div>
              <p className="text-xs font-medium mb-2">
                {t("component.developerTools.logger.sidebar.searchLabel")}
              </p>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder={t(
                    "component.developerTools.logger.sidebar.searchPlaceholder"
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-7 h-8 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Source Filter */}
            <div>
              <p className="text-xs font-medium mb-2">
                {t("component.developerTools.logger.sidebar.source")}
              </p>
              <div className="flex flex-col gap-1">
                {(["all", "frontend", "backend"] as LogSource[]).map(
                  (source) => (
                    <Badge
                      key={source}
                      variant={sourceFilter === source ? "default" : "outline"}
                      className="cursor-pointer capitalize justify-center text-xs py-1"
                      onClick={() => setSourceFilter(source)}
                    >
                      {source}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Level Filter */}
            <div>
              <p className="text-xs font-medium mb-2">
                {t("component.developerTools.logger.sidebar.level")}
              </p>
              <div className="flex flex-col gap-1">
                {(
                  ["all", "debug", "info", "warn", "error"] as LogLevelFilter[]
                ).map((level) => (
                  <Badge
                    key={level}
                    variant={levelFilter === level ? "default" : "outline"}
                    className="cursor-pointer capitalize justify-center text-xs py-1"
                    onClick={() => setLevelFilter(level)}
                  >
                    {level}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              {t("component.developerTools.logger.sidebar.counts", {
                filtered: combinedLogs.length,
                total: frontendLogs.length + backendLogs.length,
              })}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content (Log Entries) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">
            {t("component.developerTools.logger.main.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("component.developerTools.logger.main.description")}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1">
            {combinedLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {t("component.developerTools.logger.main.empty")}
              </div>
            ) : (
              combinedLogs.map((log, index) => (
                <div
                  key={`${log.source}-${log.timestamp}-${index}`}
                  className="px-2 py-1 rounded-sm hover:bg-accent/50 transition-colors flex items-center gap-1.5 text-xs overflow-hidden"
                >
                  <Badge
                    variant="outline"
                    className={`${getSourceColor(
                      log.source
                    )} text-[10px] py-0 px-1 h-4 flex-shrink-0`}
                  >
                    {log.source}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${getLevelColor(
                      log.level
                    )} text-[10px] py-0 px-1 h-4 flex-shrink-0`}
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground text-[10px] py-0 px-1 h-4 flex-shrink-0"
                  >
                    {log.module}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-mono truncate flex-1 min-w-0">
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
