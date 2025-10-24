use crate::vrchat_api::types::{LimitedUserFriend, User, UserStatus};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UserRelationship {
    CurrentUser,
    Friend,
    Known,
    Unknown,
}

fn parse_user_status(status: &str) -> UserStatus {
    match status {
        "active" => UserStatus::Active,
        "join me" => UserStatus::JoinMe,
        "ask me" => UserStatus::AskMe,
        "busy" => UserStatus::Busy,
        _ => UserStatus::Offline, // Default fallback
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Platform {
    StandaloneWindows,
    Android,
    Web,
    Other(String),
}

fn parse_platform(platform: &str) -> Platform {
    match platform {
        "standalonewindows" => Platform::StandaloneWindows,
        "android" => Platform::Android,
        "web" => Platform::Web,
        other => Platform::Other(other.to_string()),
    }
}

/// Cached user representation
#[derive(Debug, Clone)]
pub struct CachedUser {
    pub id: String,
    pub display_name: String,
    pub username: Option<String>,
    pub user_icon: Option<String>,
    pub profile_pic_override: Option<String>,
    pub profile_pic_override_thumbnail: Option<String>,
    pub current_avatar_image_url: Option<String>,
    pub current_avatar_thumbnail_image_url: Option<String>,
    pub bio: Option<String>,
    pub status: Option<UserStatus>,
    pub status_description: Option<String>,
    pub location: Option<String>,
    pub platform: Option<Platform>,
    pub relationship: UserRelationship,
    pub full_user: Option<User>,
    pub friend_data: Option<LimitedUserFriend>,
    pub last_updated: std::time::Instant,
}

impl CachedUser {
    /// Create from LimitedUserFriend (friend list entry)
    pub fn from_friend(friend: LimitedUserFriend) -> Self {
        Self {
            id: friend.id.clone(),
            display_name: friend.display_name.clone(),
            username: None,
            user_icon: friend.user_icon.clone(),
            profile_pic_override: friend.profile_pic_override.clone(),
            profile_pic_override_thumbnail: friend.profile_pic_override_thumbnail.clone(),
            current_avatar_image_url: friend.current_avatar_image_url.clone(),
            current_avatar_thumbnail_image_url: friend.current_avatar_thumbnail_image_url.clone(),
            bio: Some(friend.bio.clone()),
            status: Some(friend.status.clone()),
            status_description: Some(friend.status_description.clone()),
            location: friend.location.clone(),
            platform: Some(parse_platform(&friend.platform)),
            relationship: UserRelationship::Friend,
            full_user: None,
            friend_data: Some(friend),
            last_updated: std::time::Instant::now(),
        }
    }

    /// Create from User (full user object)
    pub fn from_user(user: User, relationship: UserRelationship) -> Self {
        Self {
            id: user.id.clone(),
            display_name: user.display_name.clone(),
            username: if user.username.is_empty() {
                None
            } else {
                Some(user.username.clone())
            },
            user_icon: user.user_icon.clone(),
            profile_pic_override: user.profile_pic_override.clone(),
            profile_pic_override_thumbnail: user.profile_pic_override_thumbnail.clone(),
            current_avatar_image_url: user.current_avatar_image_url.clone(),
            current_avatar_thumbnail_image_url: user.current_avatar_thumbnail_image_url.clone(),
            bio: Some(user.bio.clone()),
            status: Some(user.status.clone()),
            status_description: Some(user.status_description.clone()),
            location: user.location.clone(),
            platform: Some(parse_platform(&user.platform)),
            relationship,
            full_user: Some(user),
            friend_data: None,
            last_updated: std::time::Instant::now(),
        }
    }

    /// Update from friend data
    pub fn update_from_friend(&mut self, friend: LimitedUserFriend) {
        self.display_name = friend.display_name.clone();
        self.user_icon = friend.user_icon.clone();
        self.profile_pic_override = friend.profile_pic_override.clone();
        self.profile_pic_override_thumbnail = friend.profile_pic_override_thumbnail.clone();
        self.current_avatar_image_url = friend.current_avatar_image_url.clone();
        self.current_avatar_thumbnail_image_url = friend.current_avatar_thumbnail_image_url.clone();
        self.bio = Some(friend.bio.clone());
        self.status = Some(friend.status.clone());
        self.status_description = Some(friend.status_description.clone());
        self.location = friend.location.clone();
        self.platform = Some(parse_platform(&friend.platform));
        self.friend_data = Some(friend);
        self.last_updated = std::time::Instant::now();
    }

    pub fn is_online(&self) -> bool {
        self.location.as_ref().map_or(false, |loc| {
            loc != "offline" && loc != "private" && !loc.is_empty()
        })
    }

    /// Get as LimitedUserFriend if available
    pub fn as_friend(&self) -> Option<&LimitedUserFriend> {
        self.friend_data.as_ref()
    }

    pub fn age_seconds(&self) -> u64 {
        self.last_updated.elapsed().as_secs()
    }
}

/// Minimal representation of a current-user update emitted by the pipeline websocket.
#[derive(Debug, Clone)]
pub struct CurrentUserPipelineUpdate {
    pub id: String,
    pub display_name: String,
    pub username: String,
    pub status: String,
    pub status_description: String,
    pub bio: String,
    pub user_icon: Option<String>,
    pub profile_pic_override: Option<String>,
    pub profile_pic_override_thumbnail: Option<String>,
    pub current_avatar: Option<String>,
    pub current_avatar_asset_url: Option<String>,
    pub current_avatar_image_url: Option<String>,
    pub current_avatar_thumbnail_image_url: Option<String>,
    pub fallback_avatar: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Clone)]
pub struct UserStore {
    users: Arc<RwLock<HashMap<String, CachedUser>>>,
    current_user_id: Arc<RwLock<Option<String>>>,
}

impl UserStore {
    pub fn new() -> Self {
        Self {
            users: Arc::new(RwLock::new(HashMap::new())),
            current_user_id: Arc::new(RwLock::new(None)),
        }
    }

    /// Current User Management
    pub async fn set_current_user(&self, user: User) {
        let user_id = user.id.clone();
        let cached_user = CachedUser::from_user(user, UserRelationship::CurrentUser);

        let mut users = self.users.write().await;
        users.insert(user_id.clone(), cached_user);
        drop(users);

        let mut current = self.current_user_id.write().await;
        *current = Some(user_id.clone());

        log::info!("UserStore: Set current user to {}", user_id);
    }

    pub async fn get_current_user(&self) -> Option<User> {
        let current_id = self.current_user_id.read().await;
        let user_id = current_id.as_ref()?.clone();
        drop(current_id);

        let users = self.users.read().await;
        users.get(&user_id)?.full_user.clone()
    }

    pub async fn get_current_user_id(&self) -> Option<String> {
        let current = self.current_user_id.read().await;
        current.clone()
    }

    pub async fn clear_current_user(&self) {
        let mut current = self.current_user_id.write().await;
        *current = None;
        log::info!("UserStore: Cleared current user");
    }

    // Friend Management

    // TODO: Refactor this code and function name
    /// Initialize friends list (from REST API on startup)
    pub async fn set_friends(&self, friends: Vec<LimitedUserFriend>) {
        let mut users = self.users.write().await;

        // Mark all existing friends as non-friends first
        for user in users.values_mut() {
            if user.relationship == UserRelationship::Friend {
                user.relationship = UserRelationship::Known;
            }
        }

        // Add/update friends
        for friend in friends {
            let user_id = friend.id.clone();

            if let Some(existing) = users.get_mut(&user_id) {
                existing.update_from_friend(friend);
                existing.relationship = UserRelationship::Friend;
            } else {
                users.insert(user_id, CachedUser::from_friend(friend));
            }
        }

        let friend_count = users
            .values()
            .filter(|u| u.relationship == UserRelationship::Friend)
            .count();

        log::info!("UserStore: Initialized {} friends", friend_count);
    }

    /// Upsert friend
    pub async fn upsert_friend(&self, friend: LimitedUserFriend) {
        let user_id = friend.id.clone();

        // Check if this is the current user
        // Of course, don't add yourself to friends list here
        let current_id = self.current_user_id.read().await;
        if let Some(ref current) = *current_id {
            if current == &user_id {
                log::debug!(
                    "UserStore: Skipping upsert_friend for current user {}",
                    user_id
                );
                drop(current_id);

                // But still update other data if available
                let mut users = self.users.write().await;
                if let Some(existing) = users.get_mut(&user_id) {
                    if let Some(location) = friend.location.clone() {
                        existing.location = Some(location.clone());

                        if let Some(full_user) = existing.full_user.as_mut() {
                            full_user.location = Some(location);
                        }
                    }

                    if !friend.platform.is_empty() {
                        existing.platform = Some(parse_platform(&friend.platform));

                        if let Some(full_user) = existing.full_user.as_mut() {
                            full_user.platform = friend.platform.clone();
                        }
                    }

                    {
                        existing.status = Some(friend.status.clone());

                        if let Some(full_user) = existing.full_user.as_mut() {
                            full_user.status = friend.status;
                        }
                    }

                    if !friend.status_description.is_empty() {
                        existing.status_description = Some(friend.status_description.clone());

                        if let Some(full_user) = existing.full_user.as_mut() {
                            full_user.status_description = friend.status_description.clone();
                        }
                    }

                    existing.friend_data = Some(friend);
                    existing.last_updated = std::time::Instant::now();
                }
                return;
            }
        }
        drop(current_id);

        let mut users = self.users.write().await;

        if let Some(existing) = users.get_mut(&user_id) {
            existing.update_from_friend(friend);
            existing.relationship = UserRelationship::Friend;
        } else {
            users.insert(user_id.clone(), CachedUser::from_friend(friend));
        }

        log::debug!("UserStore: Upserted friend {}", user_id);
    }

    /// Mark a friend as offline
    pub async fn set_friend_offline(&self, user_id: &str) {
        let mut users = self.users.write().await;

        if let Some(user) = users.get_mut(user_id) {
            user.location = Some("offline".to_string());
            user.last_updated = std::time::Instant::now();

            if let Some(ref mut friend_data) = user.friend_data {
                friend_data.location = Some("offline".to_string());
                friend_data.platform = String::new();
            }

            log::debug!("UserStore: User {} went offline", user_id);
        }
    }

    /// Update friend's location
    pub async fn update_user_location(
        &self,
        user_id: &str,
        location: String,
        platform: Option<String>,
    ) {
        let mut users = self.users.write().await;

        if let Some(user) = users.get_mut(user_id) {
            user.location = Some(location.clone());
            if let Some(plat) = platform {
                user.platform = Some(parse_platform(&plat));
            }
            user.last_updated = std::time::Instant::now();

            if let Some(ref mut friend_data) = user.friend_data {
                friend_data.location = Some(location.clone());
                if let Some(ref plat) = user.platform {
                    friend_data.platform = match plat {
                        Platform::StandaloneWindows => "standalonewindows".to_string(),
                        Platform::Android => "android".to_string(),
                        Platform::Web => "web".to_string(),
                        Platform::Other(s) => s.clone(),
                    };
                }
            }

            log::trace!(
                "UserStore: User {} location updated to {}",
                user_id,
                location
            );
        }
    }

    /// Remove a friend when the relationship is terminated :(
    pub async fn remove_friend(&self, user_id: &str) {
        let mut users = self.users.write().await;

        if let Some(user) = users.get_mut(user_id) {
            user.relationship = UserRelationship::Known;
            user.friend_data = None;
            user.location = None;
            user.platform = None;
            user.last_updated = std::time::Instant::now();

            log::info!("UserStore: Removed friend {}", user_id);
        } else {
            log::debug!("UserStore: Attempted to remove unknown friend {}", user_id);
        }
    }

    /// Patch the cached current-user record with data streamed from the websocket.
    pub async fn apply_current_user_update(&self, patch: CurrentUserPipelineUpdate) {
        use std::time::Instant;

        {
            let mut users = self.users.write().await;
            let entry = users.entry(patch.id.clone()).or_insert_with(|| CachedUser {
                id: patch.id.clone(),
                display_name: patch.display_name.clone(),
                username: Some(patch.username.clone()),
                user_icon: patch.user_icon.clone(),
                profile_pic_override: patch.profile_pic_override.clone(),
                profile_pic_override_thumbnail: patch.profile_pic_override_thumbnail.clone(),
                current_avatar_image_url: patch.current_avatar_image_url.clone(),
                current_avatar_thumbnail_image_url: patch
                    .current_avatar_thumbnail_image_url
                    .clone(),
                bio: Some(patch.bio.clone()),
                status: Some(parse_user_status(&patch.status)),
                status_description: Some(patch.status_description.clone()),
                location: None,
                platform: None,
                relationship: UserRelationship::CurrentUser,
                full_user: None,
                friend_data: None,
                last_updated: Instant::now(),
            });

            entry.display_name = patch.display_name.clone();
            entry.username = Some(patch.username.clone());
            entry.user_icon = patch.user_icon.clone();
            entry.profile_pic_override = patch.profile_pic_override.clone();
            entry.profile_pic_override_thumbnail = patch.profile_pic_override_thumbnail.clone();
            entry.current_avatar_image_url = patch.current_avatar_image_url.clone();
            entry.current_avatar_thumbnail_image_url =
                patch.current_avatar_thumbnail_image_url.clone();
            entry.bio = Some(patch.bio.clone());
            entry.status = Some(parse_user_status(&patch.status));
            entry.status_description = Some(patch.status_description.clone());
            entry.relationship = UserRelationship::CurrentUser;
            entry.last_updated = Instant::now();

            if let Some(full_user) = entry.full_user.as_mut() {
                full_user.display_name = patch.display_name.clone();
                full_user.username = patch.username.clone();
                full_user.status = parse_user_status(&patch.status);
                full_user.status_description = patch.status_description.clone();
                full_user.bio = patch.bio.clone();
                full_user.user_icon = patch.user_icon.clone();
                full_user.profile_pic_override = patch.profile_pic_override.clone();
                full_user.profile_pic_override_thumbnail =
                    patch.profile_pic_override_thumbnail.clone();
                full_user.current_avatar = patch.current_avatar.clone();
                full_user.current_avatar_image_url = patch.current_avatar_image_url.clone();
                full_user.current_avatar_thumbnail_image_url =
                    patch.current_avatar_thumbnail_image_url.clone();
                full_user.fallback_avatar = patch.fallback_avatar.clone();
                full_user.tags = patch.tags.clone();
            }
        }

        let mut current_id = self.current_user_id.write().await;
        *current_id = Some(patch.id);
    }

    /// Get all friends (online and offline)
    pub async fn get_all_friends(&self) -> Vec<LimitedUserFriend> {
        let users = self.users.read().await;
        users
            .values()
            .filter(|u| u.relationship == UserRelationship::Friend)
            .filter_map(|u| u.friend_data.clone())
            .collect()
    }

    /// Get all online friends
    pub async fn get_online_friends(&self) -> Vec<LimitedUserFriend> {
        let users = self.users.read().await;
        users
            .values()
            .filter(|u| u.relationship == UserRelationship::Friend)
            .filter(|u| u.is_online())
            .filter_map(|u| u.friend_data.clone())
            .collect()
    }

    /// Get count of online friends
    pub async fn get_online_friend_count(&self) -> usize {
        let users = self.users.read().await;
        users
            .values()
            .filter(|u| u.relationship == UserRelationship::Friend)
            .filter(|u| u.is_online())
            .count()
    }

    // General User Queries

    /// Get a user by ID (returns friend data if they're a friend)
    pub async fn get_user(&self, user_id: &str) -> Option<LimitedUserFriend> {
        let users = self.users.read().await;
        users.get(user_id)?.friend_data.clone()
    }

    /// Get a full User object by ID
    pub async fn get_full_user(&self, user_id: &str) -> Option<User> {
        let users = self.users.read().await;
        users.get(user_id)?.full_user.clone()
    }

    /// Cache a full User object (for non-current users)
    pub async fn cache_full_user(&self, user: User) {
        let user_id = user.id.clone();
        let mut users = self.users.write().await;

        if let Some(existing) = users.get_mut(&user_id) {
            // Update existing cached user with full user data
            let relationship = existing.relationship.clone();
            existing.display_name = user.display_name.clone();

            // Only update username if it's not empty
            // You only see usernames for yourself in the API
            if !user.username.is_empty() {
                existing.username = Some(user.username.clone());
            }
            existing.user_icon = user.user_icon.clone();
            existing.profile_pic_override = user.profile_pic_override.clone();
            existing.profile_pic_override_thumbnail = user.profile_pic_override_thumbnail.clone();
            existing.current_avatar_image_url = user.current_avatar_image_url.clone();
            existing.current_avatar_thumbnail_image_url =
                user.current_avatar_thumbnail_image_url.clone();
            existing.bio = Some(user.bio.clone());
            existing.status = Some(user.status.clone());
            existing.status_description = Some(user.status_description.clone());
            existing.location = user.location.clone();
            existing.platform = Some(parse_platform(&user.platform));
            existing.full_user = Some(user);
            existing.last_updated = std::time::Instant::now();
            existing.relationship = relationship;
        } else {
            users.insert(
                user_id.clone(),
                CachedUser::from_user(user, UserRelationship::Known),
            );
        }

        log::debug!("UserStore: Cached full user data for {}", user_id);
    }

    /// Get cached user entry
    pub async fn get_cached_user(&self, user_id: &str) -> Option<CachedUser> {
        let users = self.users.read().await;
        users.get(user_id).cloned()
    }

    /// Check if a user is a friend
    pub async fn is_friend(&self, user_id: &str) -> bool {
        let users = self.users.read().await;
        users
            .get(user_id)
            .map_or(false, |u| u.relationship == UserRelationship::Friend)
    }

    /// Check if a user is online
    pub async fn is_user_online(&self, user_id: &str) -> bool {
        let users = self.users.read().await;
        users.get(user_id).map_or(false, |u| u.is_online())
    }

    /// Search users by display name (case-insensitive, partial match)
    pub async fn search_users(&self, query: &str) -> Vec<CachedUser> {
        let users = self.users.read().await;
        let query_lower = query.to_lowercase();

        users
            .values()
            .filter(|u| u.display_name.to_lowercase().contains(&query_lower))
            .cloned()
            .collect()
    }

    // Cache Management

    /// Clear all cached users (keeps current user)
    pub async fn clear_cache(&self) {
        let current_id = self.current_user_id.read().await.clone();
        let mut users = self.users.write().await;

        if let Some(current_id) = current_id {
            users.retain(|id, _| id == &current_id); // Keep only current user
        } else {
            users.clear();
        }

        log::info!("UserStore: Cleared cache");
    }

    /// Clear all data
    pub async fn clear_all(&self) {
        let mut users = self.users.write().await;
        users.clear();
        drop(users);

        let mut current = self.current_user_id.write().await;
        *current = None;

        log::info!("UserStore: Cleared all data");
    }

    /// Remove stale entries that are older than max_age_seconds
    pub async fn remove_stale(&self, max_age_seconds: u64) {
        let current_id = self.current_user_id.read().await.clone();
        let mut users = self.users.write().await;

        let before_count = users.len();
        users.retain(|id, user| {
            // Keep current user and friends
            if Some(id) == current_id.as_ref() || user.relationship == UserRelationship::Friend {
                return true;
            }
            // Keep recent entries
            user.age_seconds() < max_age_seconds
        });

        let removed = before_count - users.len();
        if removed > 0 {
            log::info!("UserStore: Removed {} stale entries", removed);
        }
    }

    pub async fn get_stats(&self) -> UserStoreStats {
        let users = self.users.read().await;
        let current_id = self.current_user_id.read().await.clone();

        UserStoreStats {
            total_cached: users.len(),
            friends: users
                .values()
                .filter(|u| u.relationship == UserRelationship::Friend)
                .count(),
            online_friends: users
                .values()
                .filter(|u| u.relationship == UserRelationship::Friend && u.is_online())
                .count(),
            has_current_user: current_id.is_some(),
        }
    }
}

impl Default for UserStore {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct UserStoreStats {
    pub total_cached: usize,
    pub friends: usize,
    pub online_friends: usize,
    pub has_current_user: bool,
}
