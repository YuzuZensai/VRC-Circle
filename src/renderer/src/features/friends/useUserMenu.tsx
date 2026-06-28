import { useState } from "react";
import { UserMinus, UserPlus, Send, LogIn, User } from "lucide-react";
import { Trans } from "react-i18next";
import { Modal } from "../../components/ui";
import type { ContextMenuEntry } from "../../components/ui";
import { useSelf } from "../../store/social";
import { parseLocation, type UserProfile } from "../../../../shared/types/user";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";

interface UnfriendState {
  friend: UserProfile;
  loading: boolean;
}

interface BuildOptions {
  includeProfile?: boolean;
  onOpen?: (id: string) => void;
}

export function useUserMenu() {
  const t = useT();
  const self = useSelf();
  const [unfriend, setUnfriend] = useState<UnfriendState | null>(null);

  const buildItems = (user: UserProfile, opts: BuildOptions = {}): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [];

    if (opts.includeProfile && opts.onOpen) {
      items.push({
        label: t("nav:friends.contextMenu.viewProfile"),
        icon: <User size={14} />,
        onClick: () => opts.onOpen!(user.id),
      });
    }

    if (user.isSelf) return items;

    if (!user.isFriend) {
      items.push({
        label: t("nav:friends.contextMenu.addFriend"),
        icon: <UserPlus size={14} />,
        onClick: () => void api.friends.add(user.id),
      });
      return items;
    }

    const selfLocation = self ? parseLocation(self.location) : null;
    const friendLocation = parseLocation(user.location);
    const selfInstanceKey = selfLocation
      ? `${selfLocation.worldId}:${selfLocation.instanceId}`
      : null;
    const friendInstanceKey = friendLocation
      ? `${friendLocation.worldId}:${friendLocation.instanceId}`
      : null;

    const canInvite = selfLocation !== null && self?.location != null;
    const canRequestInvite = friendInstanceKey !== null && selfInstanceKey !== friendInstanceKey;

    if (canInvite) {
      items.push({
        label: t("nav:friends.contextMenu.invite"),
        icon: <Send size={14} />,
        onClick: async () => {
          try {
            await api.friends.invite(user.id, self!.location!);
          } catch (err) {
            console.error("Invite failed:", errorMessage(err, "Failed to send invite"));
          }
        },
      });
    }

    if (canRequestInvite) {
      items.push({
        label: t("nav:friends.contextMenu.requestInvite"),
        icon: <LogIn size={14} />,
        onClick: async () => {
          try {
            await api.friends.requestInvite(user.id);
          } catch (err) {
            console.error("Request invite failed:", errorMessage(err, "Failed to request invite"));
          }
        },
      });
    }

    items.push({ separator: true });
    items.push({
      label: t("nav:friends.contextMenu.unfriend"),
      icon: <UserMinus size={14} />,
      danger: true,
      onClick: () => setUnfriend({ friend: user, loading: false }),
    });

    return items;
  };

  const confirmUnfriend = async () => {
    if (!unfriend) return;
    setUnfriend((s) => s && { ...s, loading: true });
    try {
      await api.friends.unfriend(unfriend.friend.id);
      setUnfriend(null);
    } catch (err) {
      console.error("Unfriend failed:", errorMessage(err, "Failed to unfriend"));
      setUnfriend((s) => s && { ...s, loading: false });
    }
  };

  const modal = (
    <Modal
      open={unfriend !== null}
      onClose={() => setUnfriend(null)}
      title={t("nav:friends.unfriendModal.title")}
      danger
      icon={<UserMinus size={18} />}
      confirmLabel={t("nav:friends.unfriendModal.confirm")}
      onConfirm={confirmUnfriend}
      confirmLoading={unfriend?.loading}
    >
      <Trans
        i18nKey="nav:friends.unfriendModal.body"
        values={{ name: unfriend?.friend.displayName }}
        components={[<strong className="font-semibold text-text" />]}
      />
    </Modal>
  );

  return { buildItems, modal };
}
