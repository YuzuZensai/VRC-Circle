use serde::{Deserialize, Serialize};
use specta::Type;

use super::enums::ReleaseStatus;

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct AvatarPerformance {
    #[serde(default)]
    pub android: Option<String>,
    #[serde(default)]
    pub ios: Option<String>,
    #[serde(default)]
    pub standalonewindows: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct AvatarStyles {
    #[serde(default)]
    pub primary: Option<String>,
    #[serde(default)]
    pub secondary: Option<String>,
}

use crate::vrchat_api::types::world::UnityPackageSummary;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LimitedAvatar {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author_id: Option<String>,
    #[serde(default)]
    pub author_name: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub thumbnail_image_url: Option<String>,
    #[serde(default)]
    pub asset_url: Option<String>,
    #[serde(default)]
    pub unity_package_url: Option<String>,
    #[serde(default)]
    pub release_status: ReleaseStatus,
    #[serde(default)]
    pub featured: Option<bool>,
    #[serde(default)]
    pub searchable: Option<bool>,
    #[serde(default)]
    pub listing_date: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub version: Option<i32>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub performance: Option<AvatarPerformance>,
    #[serde(default)]
    pub styles: Option<AvatarStyles>,
    #[serde(default)]
    pub unity_packages: Vec<UnityPackageSummary>,
}
