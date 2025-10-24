import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { AccountService } from "@/services/account";
import { WebSocketService } from "@/services/websocket";
import { VRChatService } from "@/services/vrchat";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  Users,
  Settings,
  Loader2,
  CheckCircle2,
  ChevronDown,
  IdCard,
  UserCircle,
  CircleDot,
  X,
  ChevronUp,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import type { UserStatus } from "@/types/bindings";
import type { StoredAccount } from "@/types/bindings";
import { accountsStore } from "@/stores";
import { getStatusDotClass } from "@/lib/utils";

interface AccountMenuProps {
  showThemeToggle?: boolean;
}

export function AccountMenu({
  showThemeToggle: _showThemeToggle = false,
}: AccountMenuProps) {
  const { user, logout, clearLocalSession, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>(
    accountsStore.getSnapshot() ?? []
  );
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [accountsExpanded, setAccountsExpanded] = useState(() => {
    const switchable =
      accountsStore.getSnapshot()?.filter((acc) => acc.user_id !== user?.id) ??
      [];
    return switchable.length <= 3;
  });

  useEffect(() => {
    const unsubscribe = accountsStore.subscribe((value) => {
      setAccounts(value ?? []);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const switchableAccounts = accounts.filter(
    (account) => account.user_id !== user?.id
  );

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async () => {
    setIsLoading(true);
    try {
      await clearLocalSession();
      setMenuOpen(false);
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

  const handleOpenSettings = () => {
    setMenuOpen(false);
    navigate("/settings");
  };

  const handleStatusChange = async (
    status: UserStatus | string,
    statusDescription: string = ""
  ) => {
    if (!user || updatingStatus) return;

    setUpdatingStatus(true);
    try {
      const updatedUser = await VRChatService.updateStatus(
        status,
        statusDescription
      );
      setUser(updatedUser);
      setCustomStatusInput("");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(t("component.accountMenu.statusUpdateFailed"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCustomStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customStatusInput.trim()) {
      await handleStatusChange(
        user?.status || "active",
        customStatusInput.trim()
      );
      setMenuOpen(false);
    }
  };

  const handleClearStatus = () => {
    if (!user || updatingStatus) return;
    handleStatusChange(user.status ?? "active", "");
  };

  const handleCopyStatus = async () => {
    if (!user?.statusDescription) return;
    try {
      await navigator.clipboard.writeText(user.statusDescription);
      toast.success(t("component.accountMenu.statusCopied"));
    } catch (error) {
      console.error("Failed to copy status:", error);
      toast.error(t("component.accountMenu.statusCopyFailed"));
    }
  };

  const handleQuickSwitch = async (userId: string) => {
    if (switchingAccount || userId === user?.id) {
      return;
    }

    setSwitchingAccount(userId);
    try {
      if (user) {
        await accountsStore.saveFromUser(user);
      }

      // Stop current WebSocket
      await WebSocketService.stop();

      // Switch account
      const switchedUser = await AccountService.switchAccount(userId);
      setUser(switchedUser);

      // Start WebSocket for new account
      await WebSocketService.start();
      await accountsStore.refresh();

      if (location.pathname === "/login") {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to switch account", error);
      toast.error(t("component.accountMenu.accountSwitchFailed"));
    } finally {
      setSwitchingAccount(null);
    }
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="default"
          className="rounded-full h-10 px-2 pr-3 gap-2 flex items-center"
        >
          {user ? (
            <UserAvatar
              user={user}
              className="h-8 w-8"
              imageClassName="object-cover"
              fallbackClassName="text-xs font-medium bg-muted/50"
              statusClassName={getStatusDotClass(user)}
              statusSize="45%"
              statusOffset="-12%"
              statusContainerClassName="bg-background/90 shadow-sm"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {user && (
          <>
            <div className="px-2 py-1.5 flex items-center gap-3 group">
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer rounded-sm -mx-2 px-2 hover:bg-accent transition-colors"
                onClick={handleViewProfile}
              >
                <UserAvatar
                  user={user}
                  className="h-9 w-9"
                  imageClassName="object-cover"
                  fallbackClassName="text-sm font-medium bg-muted/50"
                  statusClassName={getStatusDotClass(user)}
                  statusSize="45%"
                  statusOffset="-10%"
                  statusContainerClassName="bg-background/90 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={isLoading}
                className="h-8 w-8 shrink-0 text-red-500 hover:text-red-500"
                title={t("component.accountMenu.logout")}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenuSeparator />
          </>
        )}

        {user && (
          <>
            {user.statusDescription && (
              <div className="group relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
                <span className="truncate flex-1" onClick={handleCopyStatus}>
                  {user.statusDescription}
                </span>
                <button
                  type="button"
                  className="mr-2 inline-flex size-5 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearStatus();
                  }}
                  title={t("component.accountMenu.clearStatus")}
                  aria-label={t("component.accountMenu.clearStatus")}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                disabled={updatingStatus}
                className="[&>svg:last-child]:mr-2"
              >
                <CircleDot className="h-4 w-4" />
                <span>{t("component.accountMenu.setStatus")}</span>
                {updatingStatus && (
                  <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem
                  onClick={() =>
                    handleStatusChange("active", user.statusDescription ?? "")
                  }
                  disabled={updatingStatus}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-transparent ring-2 ring-emerald-500 ring-inset" />
                    <span>{t("common.status.active")}</span>
                  </div>
                  {user.status === "active" && (
                    <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    handleStatusChange("join me", user.statusDescription ?? "")
                  }
                  disabled={updatingStatus}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-sky-500" />
                    <span>{t("common.status.joinMe")}</span>
                  </div>
                  {user.status === "join me" && (
                    <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    handleStatusChange("ask me", user.statusDescription ?? "")
                  }
                  disabled={updatingStatus}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>{t("common.status.askMe")}</span>
                  </div>
                  {user.status === "ask me" && (
                    <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    handleStatusChange("busy", user.statusDescription ?? "")
                  }
                  disabled={updatingStatus}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span>{t("common.status.busy")}</span>
                  </div>
                  {user.status === "busy" && (
                    <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <form
                    onSubmit={handleCustomStatusSubmit}
                    className="flex flex-col gap-2"
                  >
                    <Input
                      type="text"
                      placeholder={t(
                        "component.accountMenu.customStatusPlaceholder"
                      )}
                      value={customStatusInput}
                      onChange={(e) => setCustomStatusInput(e.target.value)}
                      disabled={updatingStatus}
                      className="h-8 text-sm"
                      maxLength={32}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!customStatusInput.trim() || updatingStatus}
                      className="h-7 text-xs"
                    >
                      {t("component.accountMenu.setCustomStatus")}
                    </Button>
                  </form>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem onClick={handleViewProfile}>
              <IdCard className="h-4 w-4" />
              <span>{t("component.accountMenu.viewProfile")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        )}

        <div
          className="flex cursor-pointer select-none items-center gap-2 px-2 py-1.5 text-sm font-semibold hover:bg-accent rounded-sm"
          onClick={() => setAccountsExpanded(!accountsExpanded)}
        >
          <span className="flex-1">
            {t("component.accountMenu.switchAccount")}
          </span>
          {accountsExpanded ? (
            <ChevronUp className="h-4 w-4 mr-2" />
          ) : (
            <ChevronDown className="h-4 w-4 mr-2" />
          )}
        </div>
        {accountsExpanded &&
          switchableAccounts.map((account) => {
            const isCurrent = account.user_id === user?.id;
            const isSwitching = switchingAccount === account.user_id;
            const disabled =
              isCurrent || (switchingAccount !== null && !isSwitching);
            const primaryAvatar =
              account.avatar_url ?? account.avatar_fallback_url ?? undefined;
            const fallbackAvatar =
              account.avatar_fallback_url ?? account.avatar_url ?? undefined;

            return (
              <DropdownMenuItem
                key={account.user_id}
                onClick={(e) => {
                  e.preventDefault();
                  handleQuickSwitch(account.user_id);
                }}
                onSelect={(e) => {
                  e.preventDefault();
                }}
                disabled={disabled}
              >
                <UserAvatar
                  user={{
                    displayName: account.display_name,
                    userIcon: primaryAvatar,
                    profilePicOverride: primaryAvatar,
                    profilePicOverrideThumbnail: primaryAvatar,
                    currentAvatarImageUrl: fallbackAvatar,
                    currentAvatarThumbnailImageUrl: fallbackAvatar,
                  }}
                  className="h-8 w-8"
                  fallbackClassName="text-xs font-medium"
                />
                <div className="flex min-w-0 flex-col flex-1">
                  <span className="text-sm font-medium truncate">
                    {account.display_name ||
                      t("component.accountMenu.unknownUser")}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    @
                    {account.username ||
                      t("component.accountMenu.unknownUsername")}
                  </span>
                </div>
                {isCurrent ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        {accountsExpanded && (
          <DropdownMenuItem onClick={handleAddAccount} disabled={isLoading}>
            <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-muted">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-col flex-1">
              <span className="text-sm font-medium">
                {t("component.accountMenu.addAccount")}
              </span>
            </div>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpenSettings}>
          <Settings className="h-4 w-4" />
          <span>{t("component.accountMenu.settings")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
