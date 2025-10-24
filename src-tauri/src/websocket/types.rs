use crate::vrchat_api::types::LimitedUserFriend;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;
use specta::Type;
use std::collections::BTreeMap;

/// Wrapper that transparently handles VRChat's double-encoded message payloads.
/// Some events ship their "content" field as a JSON string containing another
/// JSON document. Others already provide structured JSON. This helper will
/// attempt to deserialize the content value directly and, if that fails,
/// attempt to parse the inner string as JSON and deserialize that instead.
#[derive(Debug, Clone)]
pub struct DoubleEncoded<T> {
    inner: T,
}

impl<T> DoubleEncoded<T> {
    pub fn into_inner(self) -> T {
        self.inner
    }

    pub fn as_inner(&self) -> &T {
        &self.inner
    }
}

impl<T> Serialize for DoubleEncoded<T>
where
    T: Serialize,
{
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.inner.serialize(serializer)
    }
}

impl<'de, T> Deserialize<'de> for DoubleEncoded<T>
where
    T: DeserializeOwned,
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        let inner = decode_value::<T>(value).map_err(serde::de::Error::custom)?;
        Ok(Self { inner })
    }
}

fn decode_value<T>(value: Value) -> Result<T, serde_json::Error>
where
    T: DeserializeOwned,
{
    match serde_json::from_value::<T>(value.clone()) {
        Ok(result) => Ok(result),
        Err(primary_err) => {
            if let Value::String(raw) = value {
                // Attempt to parse the string as JSON and then deserialize to the target type.
                match serde_json::from_str::<Value>(&raw) {
                    Ok(decoded) => serde_json::from_value::<T>(decoded),
                    Err(_) => Err(primary_err),
                }
            } else {
                Err(primary_err)
            }
        }
    }
}

/// WebSocket message envelope for pipeline events.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "content")]
pub enum WebSocketMessage {
    #[serde(rename = "notification")]
    Notification(DoubleEncoded<NotificationPayload>),
    #[serde(rename = "response-notification")]
    ResponseNotification(DoubleEncoded<ResponseNotificationContent>),
    #[serde(rename = "see-notification")]
    SeeNotification(DoubleEncoded<String>),
    #[serde(rename = "hide-notification")]
    HideNotification(DoubleEncoded<String>),
    #[serde(rename = "clear-notification")]
    ClearNotification,
    #[serde(rename = "notification-v2")]
    NotificationV2(DoubleEncoded<NotificationV2Payload>),
    #[serde(rename = "notification-v2-update")]
    NotificationV2Update(DoubleEncoded<NotificationV2UpdatePayload>),
    #[serde(rename = "notification-v2-delete")]
    NotificationV2Delete(DoubleEncoded<NotificationV2DeletePayload>),
    #[serde(rename = "friend-add")]
    FriendAdd(DoubleEncoded<FriendAddContent>),
    #[serde(rename = "friend-delete")]
    FriendDelete(DoubleEncoded<FriendDeleteContent>),
    #[serde(rename = "friend-update")]
    FriendUpdate(DoubleEncoded<FriendUpdateContent>),
    #[serde(rename = "friend-online")]
    FriendOnline(DoubleEncoded<FriendOnlineContent>),
    #[serde(rename = "friend-active")]
    FriendActive(DoubleEncoded<FriendActiveContent>),
    #[serde(rename = "friend-offline")]
    FriendOffline(DoubleEncoded<FriendOfflineContent>),
    #[serde(rename = "friend-location")]
    FriendLocation(DoubleEncoded<FriendLocationContent>),
    #[serde(rename = "user-update")]
    UserUpdate(DoubleEncoded<UserUpdateContent>),
    #[serde(rename = "user-location")]
    UserLocation(DoubleEncoded<UserLocationContent>),
    #[serde(rename = "user-badge-assigned")]
    UserBadgeAssigned(DoubleEncoded<UserBadgeAssignedContent>),
    #[serde(rename = "user-badge-unassigned")]
    UserBadgeUnassigned(DoubleEncoded<UserBadgeUnassignedContent>),
    #[serde(rename = "content-refresh")]
    ContentRefresh(DoubleEncoded<ContentRefreshContent>),
    #[serde(rename = "modified-image-update")]
    ModifiedImageUpdate(DoubleEncoded<ModifiedImageUpdateContent>),
    #[serde(rename = "instance-queue-joined")]
    InstanceQueueJoined(DoubleEncoded<InstanceQueueJoinedContent>),
    #[serde(rename = "instance-queue-ready")]
    InstanceQueueReady(DoubleEncoded<InstanceQueueReadyContent>),
    #[serde(rename = "group-joined")]
    GroupJoined(DoubleEncoded<GroupChangedContent>),
    #[serde(rename = "group-left")]
    GroupLeft(DoubleEncoded<GroupChangedContent>),
    #[serde(rename = "group-member-updated")]
    GroupMemberUpdated(DoubleEncoded<GroupMemberUpdatedContent>),
    #[serde(rename = "group-role-updated")]
    GroupRoleUpdated(DoubleEncoded<GroupRoleUpdatedContent>),
    #[serde(other)]
    Unknown,
}

// Notification payloads
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPayload {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(rename = "type", default)]
    pub kind: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub sender_user_id: Option<String>,
    #[serde(default)]
    pub sender_username: Option<String>,
    #[serde(default)]
    pub receiver_user_id: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub details: Option<Value>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub link: Option<String>,
    #[serde(default)]
    pub link_text: Option<String>,
    #[serde(default)]
    pub seen: Option<bool>,
    #[serde(default)]
    pub can_respond: Option<bool>,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub expiry_after_seen: Option<i64>,
    #[serde(default)]
    pub require_seen: Option<bool>,
    #[serde(default)]
    pub hide_after_seen: Option<bool>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseNotificationContent {
    pub notification_id: String,
    pub receiver_id: String,
    pub response_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationV2Payload {
    pub id: String,
    pub version: i32,
    #[serde(rename = "type")]
    pub kind: String,
    pub category: String,
    pub is_system: bool,
    pub ignore_dnd: bool,
    #[serde(default)]
    pub sender_user_id: Option<String>,
    #[serde(default)]
    pub sender_username: Option<String>,
    pub receiver_user_id: String,
    #[serde(default)]
    pub related_notifications_id: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub link: Option<String>,
    #[serde(default)]
    pub link_text: Option<String>,
    #[serde(default)]
    pub responses: Vec<NotificationV2Response>,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub expiry_after_seen: Option<i64>,
    #[serde(default)]
    pub require_seen: Option<bool>,
    #[serde(default)]
    pub seen: Option<bool>,
    #[serde(default)]
    pub can_delete: Option<bool>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationV2Response {
    #[serde(rename = "type", default)]
    pub kind: Option<String>,
    #[serde(default)]
    pub data: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationV2UpdatePayload {
    pub id: String,
    pub version: i32,
    #[serde(default)]
    pub updates: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationV2DeletePayload {
    #[serde(default)]
    pub ids: Vec<String>,
    pub version: i32,
}

// Friend events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FriendAddContent {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub user: LimitedUserFriend,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FriendDeleteContent {
    #[serde(rename = "userId")]
    pub user_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendUpdateContent {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub user: LimitedUserFriend,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendOnlineContent {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(default)]
    pub platform: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub can_request_invite: Option<bool>,
    pub user: LimitedUserFriend,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendActiveContent {
    #[serde(rename = "userid", alias = "userId")]
    pub user_id: String,
    #[serde(default)]
    pub platform: Option<String>,
    pub user: LimitedUserFriend,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendOfflineContent {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(default)]
    pub platform: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendLocationContent {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub location: String,
    #[serde(default)]
    pub traveling_to_location: Option<String>,
    #[serde(default)]
    pub world_id: Option<String>,
    #[serde(default)]
    pub can_request_invite: Option<bool>,
    #[serde(default)]
    pub user: Option<LimitedUserFriend>,
}

// User events
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UserUpdateContent {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub user: PipelineUserSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PipelineUserSummary {
    #[serde(default)]
    pub bio: String,
    #[serde(default)]
    pub current_avatar: Option<String>,
    #[serde(default)]
    pub current_avatar_asset_url: Option<String>,
    #[serde(default)]
    pub current_avatar_image_url: Option<String>,
    #[serde(default)]
    pub current_avatar_thumbnail_image_url: Option<String>,
    pub display_name: String,
    #[serde(default)]
    pub fallback_avatar: Option<String>,
    pub id: String,
    #[serde(default)]
    pub profile_pic_override: Option<String>,
    #[serde(default)]
    pub profile_pic_override_thumbnail_image_url: Option<String>,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub status_description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub user_icon: Option<String>,
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UserLocationContent {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(default)]
    pub user: Option<LimitedUserFriend>,
    pub location: String,
    #[serde(default)]
    pub instance: Option<String>,
    #[serde(default)]
    pub traveling_to_location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserBadgeAssignedContent {
    pub badge: PipelineBadge,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineBadge {
    pub badge_id: String,
    #[serde(default)]
    pub badge_name: Option<String>,
    #[serde(default)]
    pub badge_description: Option<String>,
    #[serde(default)]
    pub badge_image_url: Option<String>,
    #[serde(default)]
    pub assigned_at: Option<String>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UserBadgeUnassignedContent {
    pub badge_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ContentRefreshContent {
    pub content_type: String,
    pub file_id: Option<String>,
    #[serde(default)]
    pub item_id: Option<String>,
    #[serde(default)]
    pub item_type: Option<String>,
    #[serde(default)]
    pub action_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ModifiedImageUpdateContent {
    pub file_id: String,
    pub pixel_size: i64,
    pub version_number: i64,
    pub needs_processing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InstanceQueueJoinedContent {
    pub instance_location: String,
    pub position: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InstanceQueueReadyContent {
    pub instance_location: String,
    pub expiry: String,
}

// Group events
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GroupChangedContent {
    pub group_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupMemberUpdatedContent {
    pub member: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupRoleUpdatedContent {
    pub role: Value,
}

// Typed payloads for frontend events
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendOnlineEvent {
    pub user_id: String,
    pub user: LimitedUserFriend,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendOfflineEvent {
    pub user_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendUpdateEvent {
    pub user_id: String,
    pub user: LimitedUserFriend,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FriendRemovedEvent {
    pub user_id: String,
}
