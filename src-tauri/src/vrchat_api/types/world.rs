use serde::{Deserialize, Serialize};
use specta::Type;

use super::enums::ReleaseStatus;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UnityPackageSummary {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub asset_url: Option<String>,
    #[serde(default)]
    pub asset_version: Option<i32>,
    #[serde(default)]
    pub platform: Option<String>,
    #[serde(default)]
    pub unity_version: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub performance_rating: Option<String>,
    #[serde(default)]
    pub scan_status: Option<String>,
    #[serde(default)]
    pub variant: Option<String>,
    #[serde(default)]
    pub unity_sort_number: Option<f64>,
    #[serde(default)]
    pub impostorizer_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LimitedWorld {
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
    pub release_status: ReleaseStatus,
    #[serde(default)]
    pub publication_date: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub labs_publication_date: Option<String>,
    #[serde(default)]
    pub visits: Option<i32>,
    #[serde(default)]
    pub favorites: Option<i32>,
    #[serde(default)]
    pub popularity: Option<i32>,
    #[serde(default)]
    pub occupants: Option<i32>,
    #[serde(default)]
    pub capacity: Option<i32>,
    #[serde(default)]
    pub recommended_capacity: Option<i32>,
    #[serde(default)]
    pub heat: Option<i32>,
    #[serde(default)]
    pub organization: Option<String>,
    #[serde(default)]
    pub preview_youtube_id: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub unity_packages: Vec<UnityPackageSummary>,
}
