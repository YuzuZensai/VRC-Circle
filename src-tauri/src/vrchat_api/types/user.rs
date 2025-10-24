use serde::{Deserialize, Serialize};
use specta::Type;

use super::enums::{UserStatus, DeveloperType, AgeVerificationStatus, FriendRequestStatus};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    #[serde(default)]
    pub username: String,
    pub display_name: String,
    #[serde(default)]
    pub accepted_privacy_version: Option<i32>,
    #[serde(default)]
    pub accepted_tos_version: Option<i32>,
    #[serde(default)]
    pub account_deletion_date: Option<String>,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub status: UserStatus,
    #[serde(default)]
    pub status_description: String,
    #[serde(default)]
    pub status_first_time: Option<bool>,
    #[serde(default)]
    pub status_history: Vec<String>,
    #[serde(default)]
    pub bio: String,
    #[serde(default)]
    pub bio_links: Vec<String>,
    #[serde(default)]
    pub age_verification_status: AgeVerificationStatus,
    #[serde(default)]
    pub age_verified: Option<bool>,
    #[serde(default)]
    pub is_adult: Option<bool>,
    #[serde(default)]
    pub date_joined: Option<String>,
    #[serde(default)]
    pub last_login: Option<String>,
    #[serde(default)]
    pub last_activity: Option<String>,
    #[serde(default)]
    pub last_platform: Option<String>,
    #[serde(default)]
    pub last_mobile: Option<String>,
    #[serde(default)]
    pub platform: String,
    #[serde(default)]
    pub platform_history: Vec<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub traveling_to_world: Option<String>,
    #[serde(default)]
    pub traveling_to_location: Option<String>,
    #[serde(default)]
    pub traveling_to_instance: Option<String>,
    #[serde(default)]
    pub home_location: Option<String>,
    #[serde(default)]
    pub instance_id: Option<String>,
    #[serde(default)]
    pub world_id: Option<String>,
    #[serde(default)]
    pub allow_avatar_copying: Option<bool>,
    #[serde(default)]
    pub two_factor_auth_enabled: Option<bool>,
    #[serde(default)]
    pub two_factor_auth_enabled_date: Option<String>,
    #[serde(default)]
    pub current_avatar: Option<String>,
    #[serde(default)]
    pub fallback_avatar: Option<String>,
    #[serde(default)]
    pub current_avatar_tags: Vec<String>,
    #[serde(default)]
    pub profile_pic_override: Option<String>,
    #[serde(default)]
    pub profile_pic_override_thumbnail: Option<String>,
    #[serde(default)]
    pub user_icon: Option<String>,
    #[serde(default)]
    pub current_avatar_image_url: Option<String>,
    #[serde(default)]
    pub current_avatar_thumbnail_image_url: Option<String>,
    #[serde(default)]
    pub banner_id: Option<String>,
    #[serde(default)]
    pub banner_url: Option<String>,
    #[serde(default)]
    pub pronouns: Option<String>,
    #[serde(default)]
    pub languages: Option<Vec<String>>,
    #[serde(default)]
    pub pronouns_history: Vec<String>,
    #[serde(default)]
    pub friends: Vec<String>,
    #[serde(default)]
    pub friend_group_names: Vec<String>,
    #[serde(default)]
    pub friend_key: Option<String>,
    #[serde(default)]
    pub friend_request_status: FriendRequestStatus,
    #[serde(default)]
    pub past_display_names: Option<Vec<PastDisplayName>>,
    #[serde(default)]
    pub badges: Option<Vec<Badge>>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub is_friend: Option<bool>,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub developer_type: DeveloperType,
    #[serde(default)]
    pub is_booping_enabled: Option<bool>,
    #[serde(default)]
    pub receive_mobile_invitations: Option<bool>,
    #[serde(default)]
    pub hide_content_filter_settings: Option<bool>,
    #[serde(default)]
    pub has_birthday: Option<bool>,
    #[serde(default)]
    pub has_email: Option<bool>,
    #[serde(default)]
    pub has_pending_email: Option<bool>,
    #[serde(default)]
    pub has_logged_in_from_client: Option<bool>,
    #[serde(default)]
    pub unsubscribe: Option<bool>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub email_verified: Option<bool>,
    #[serde(default)]
    pub obfuscated_email: Option<String>,
    #[serde(default)]
    pub user_language: Option<String>,
    #[serde(default)]
    pub user_language_code: Option<String>,
    #[serde(default)]
    pub discord_id: Option<String>,
    #[serde(default)]
    pub discord_details: Option<DiscordDetails>,
    #[serde(default)]
    pub google_id: Option<String>,
    #[serde(default)]
    pub google_details: Option<GoogleDetails>,
    #[serde(default)]
    pub steam_id: Option<String>,
    #[serde(default)]
    pub steam_details: Option<SteamDetails>,
    #[serde(default)]
    pub oculus_id: Option<String>,
    #[serde(default)]
    pub pico_id: Option<String>,
    #[serde(default)]
    pub vive_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiscordDetails {
    #[serde(default)]
    pub global_name: Option<String>,
    #[serde(default)]
    pub id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GoogleDetails {
    #[serde(default)]
    pub email_matches: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SteamDetails {
    #[serde(default)]
    pub avatar: Option<String>,
    #[serde(default)]
    pub avatarfull: Option<String>,
    #[serde(default)]
    pub avatarhash: Option<String>,
    #[serde(default)]
    pub avatarmedium: Option<String>,
    #[serde(default)]
    pub communityvisibilitystate: Option<i32>,
    #[serde(default)]
    pub gameextrainfo: Option<String>,
    #[serde(default)]
    pub gameid: Option<String>,
    #[serde(default)]
    pub loccountrycode: Option<String>,
    #[serde(default)]
    pub locstatecode: Option<String>,
    #[serde(default)]
    pub personaname: Option<String>,
    #[serde(default)]
    pub personastate: Option<i32>,
    #[serde(default)]
    pub personastateflags: Option<i32>,
    #[serde(default)]
    pub primaryclanid: Option<String>,
    #[serde(default)]
    pub profilestate: Option<i32>,
    #[serde(default)]
    pub profileurl: Option<String>,
    #[serde(default)]
    pub steamid: Option<String>,
    #[serde(default)]
    pub timecreated: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PastDisplayName {
    pub display_name: String,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub reverted: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Badge {
    pub badge_id: String,
    #[serde(default)]
    pub badge_name: String,
    #[serde(default)]
    pub badge_description: String,
    #[serde(default)]
    pub assigned_at: Option<String>,
    #[serde(default)]
    pub showcased: bool,
    #[serde(default)]
    pub badge_image_url: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LimitedUserFriend {
    pub id: String,
    pub display_name: String,
    #[serde(default)]
    pub bio: String,
    #[serde(default)]
    pub bio_links: Vec<String>,
    #[serde(default)]
    pub current_avatar_image_url: Option<String>,
    #[serde(default)]
    pub current_avatar_thumbnail_image_url: Option<String>,
    #[serde(default)]
    pub current_avatar_tags: Vec<String>,
    #[serde(default)]
    pub developer_type: DeveloperType,
    #[serde(default)]
    pub friend_key: Option<String>,
    #[serde(default)]
    pub is_friend: bool,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub last_platform: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub last_login: Option<String>,
    #[serde(default)]
    pub last_activity: Option<String>,
    #[serde(default)]
    pub last_mobile: Option<String>,
    #[serde(default)]
    pub platform: String,
    #[serde(default)]
    pub profile_pic_override: Option<String>,
    #[serde(default)]
    pub profile_pic_override_thumbnail: Option<String>,
    #[serde(default)]
    pub status: UserStatus,
    #[serde(default)]
    pub status_description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub user_icon: Option<String>,
}
