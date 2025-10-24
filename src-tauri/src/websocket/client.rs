use futures_util::StreamExt;
use http::Request;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tokio::time::Duration;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{Message, handshake::client::generate_key},
};

use super::types::*;
use crate::store::{UserStore, user_store::CurrentUserPipelineUpdate};
use crate::vrchat_api::error::{VRCError, VRCResult};

const PIPELINE_BASE_URL: &str = "wss://pipeline.vrchat.cloud/";
const PIPELINE_HOST: &str = "pipeline.vrchat.cloud";
use crate::http_common::USER_AGENT_STRING;
// const HEARTBEAT_INTERVAL_SECS: u64 = 30;

pub struct VRChatWebSocket {
    auth_cookie: Arc<Mutex<Option<String>>>,
    two_factor_cookie: Arc<Mutex<Option<String>>>,
    app_handle: AppHandle,
    running: Arc<Mutex<bool>>,
    user_store: UserStore,
}

impl VRChatWebSocket {
    pub fn new(app_handle: AppHandle, user_store: UserStore) -> Self {
        Self {
            auth_cookie: Arc::new(Mutex::new(None)),
            two_factor_cookie: Arc::new(Mutex::new(None)),
            app_handle,
            running: Arc::new(Mutex::new(false)),
            user_store,
        }
    }

    pub fn get_user_store(&self) -> UserStore {
        self.user_store.clone()
    }

    pub async fn set_cookies(
        &self,
        auth_cookie: Option<String>,
        two_factor_cookie: Option<String>,
    ) {
        let mut auth = self.auth_cookie.lock().await;
        *auth = auth_cookie;
        drop(auth);

        let mut two_fa = self.two_factor_cookie.lock().await;
        *two_fa = two_factor_cookie;
    }

    pub async fn start(&self) -> VRCResult<()> {
        let mut running = self.running.lock().await;
        if *running {
            return Ok(());
        }
        *running = true;
        drop(running);

        let auth_cookie = self.auth_cookie.clone();
        let two_factor_cookie = self.two_factor_cookie.clone();
        let app_handle = self.app_handle.clone();
        let running = self.running.clone();
        let user_store = self.user_store.clone();

        tokio::spawn(async move {
            Self::run_connection_loop(
                auth_cookie,
                two_factor_cookie,
                app_handle,
                running,
                user_store,
            )
            .await;
        });

        Ok(())
    }

    pub async fn stop(&self) {
        let mut running = self.running.lock().await;
        *running = false;
    }

    async fn run_connection_loop(
        auth_cookie: Arc<Mutex<Option<String>>>,
        two_factor_cookie: Arc<Mutex<Option<String>>>,
        app_handle: AppHandle,
        running: Arc<Mutex<bool>>,
        user_store: UserStore,
    ) {
        let mut reconnect_delay = 2;
        const MAX_RECONNECT_DELAY: u64 = 60;

        loop {
            {
                let is_running = running.lock().await;
                if !*is_running {
                    break;
                }
            }

            let cookies = {
                let auth = auth_cookie.lock().await;
                let two_fa = two_factor_cookie.lock().await;
                (auth.clone(), two_fa.clone())
            };

            if cookies.0.is_none() {
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }

            match Self::connect_and_listen(
                &cookies.0.unwrap(),
                cookies.1.as_deref(),
                &app_handle,
                &running,
                &user_store,
            )
            .await
            {
                Ok(_) => {
                    // Reset delay on successful connection
                    reconnect_delay = 2;
                }
                Err(e) => {
                    log::error!("WebSocket error: {:?}", e);
                }
            }

            {
                let is_running = running.lock().await;
                if !*is_running {
                    break;
                }
            }

            // Exponential backoff for reconnection
            log::debug!("Reconnecting WebSocket in {} seconds...", reconnect_delay);
            tokio::time::sleep(Duration::from_secs(reconnect_delay)).await;
            reconnect_delay = (reconnect_delay * 2).min(MAX_RECONNECT_DELAY);
        }
    }

    async fn connect_and_listen(
        auth_cookie: &str,
        two_factor_cookie: Option<&str>,
        app_handle: &AppHandle,
        running: &Arc<Mutex<bool>>,
        user_store: &UserStore,
    ) -> VRCResult<()> {
        let auth_cookie_value = auth_cookie.split(';').next().unwrap_or(auth_cookie).trim();
        let auth_token = auth_cookie_value
            .splitn(2, '=')
            .nth(1)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                VRCError::invalid_input(
                    "Auth cookie missing auth token required for pipeline WebSocket",
                )
            })?;
        let websocket_url = format!("{PIPELINE_BASE_URL}?authToken={}", auth_token);

        log::debug!("Attempting WebSocket connection to: {}", websocket_url);
        log::trace!(
            "Using auth cookie (first 20 chars): {}...",
            &auth_cookie_value.chars().take(20).collect::<String>()
        );

        // Build Cookie
        let mut cookie_parts = vec![auth_cookie_value.to_string()];
        if let Some(two_fa) = two_factor_cookie {
            let two_fa_value = two_fa.split(';').next().unwrap_or(two_fa).trim();
            if !two_fa_value.is_empty() {
                cookie_parts.push(two_fa_value.to_string());
            }
        }
        let cookie_header = cookie_parts.join("; ");

        // Build WebSocket request
        let ws_key = generate_key();
        let request = Request::builder()
            .method("GET")
            .uri(&websocket_url)
            .header("Host", PIPELINE_HOST)
            .header("User-Agent", USER_AGENT_STRING)
            .header("Connection", "Upgrade")
            .header("Upgrade", "websocket")
            .header("Sec-WebSocket-Version", "13")
            .header("Sec-WebSocket-Key", ws_key)
            .header("Cookie", cookie_header)
            .body(())
            .map_err(|e| VRCError::network(format!("Failed to build WebSocket request: {}", e)))?;

        let (ws_stream, response) = connect_async(request)
            .await
            .map_err(|e| VRCError::network(format!("WebSocket connection failed: {}", e)))?;

        log::debug!(
            "WebSocket handshake response status: {:?}",
            response.status()
        );

        log::info!("WebSocket connected");
        let _ = app_handle.emit("websocket-connected", ());

    let (_write, mut read) = ws_stream.split();

        // Ping task
        // Disabled, as VRChat pipeline seems to not require pings.
        // let running_ping = running.clone();
        // let ping_task = tokio::spawn(async move {
        //     let mut ping_interval = interval(Duration::from_secs(HEARTBEAT_INTERVAL_SECS));
        //     loop {
        //         ping_interval.tick().await;
        //         {
        //             let is_running = running_ping.lock().await;
        //             if !*is_running {
        //                 break;
        //             }
        //         }
        //         if write.send(Message::Ping(vec![])).await.is_err() {
        //             break;
        //         }
        //     }
        // });

        // Main message loop
        while let Some(msg) = read.next().await {
            {
                let is_running = running.lock().await;
                if !*is_running {
                    break;
                }
            }

            match msg {
                Ok(Message::Text(text)) => {
                    if let Err(e) = Self::handle_message(&text, app_handle, user_store).await {
                        log::error!("Error handling WebSocket message: {:?}", e);
                    }
                }
                Ok(Message::Close(_)) => {
                    log::info!("WebSocket closed by server");
                    break;
                }
                Err(e) => {
                    log::error!("WebSocket read error: {:?}", e);
                    break;
                }
                _ => {}
            }
        }

        //ping_task.abort();
        let _ = app_handle.emit("websocket-disconnected", ());
        Ok(())
    }

    async fn handle_message(
        text: &str,
        app_handle: &AppHandle,
        user_store: &UserStore,
    ) -> VRCResult<()> {
        log::trace!("WebSocket Message Received: {}", text);

        // Parse the outer envelope
        let message: WebSocketMessage = serde_json::from_str(text)
            .map_err(|e| VRCError::parse(format!("Failed to parse WebSocket message: {}", e)))?;

        // Handle different message types
        match message {
            WebSocketMessage::Notification(payload) => {
                let payload = payload.into_inner();
                log::trace!(
                    "Notification event: {}",
                    payload.kind.as_deref().unwrap_or("unknown")
                );
                let _ = app_handle.emit("vrchat-notification", &payload);
            }
            WebSocketMessage::ResponseNotification(payload) => {
                let payload = payload.into_inner();
                log::trace!(
                    "Notification response: notification={}, response={}",
                    payload.notification_id,
                    payload.response_id
                );
                let _ = app_handle.emit("vrchat-notification-response", &payload);
            }
            WebSocketMessage::SeeNotification(notification_id) => {
                let notification_id = notification_id.into_inner();
                log::trace!("Notification seen: {}", notification_id);
                let _ = app_handle.emit("vrchat-notification-see", &notification_id);
            }
            WebSocketMessage::HideNotification(notification_id) => {
                let notification_id = notification_id.into_inner();
                log::trace!("Notification hide requested: {}", notification_id);
                let _ = app_handle.emit("vrchat-notification-hide", &notification_id);
            }
            WebSocketMessage::ClearNotification => {
                log::trace!("Notification clear requested");
                let _ = app_handle.emit("vrchat-notification-clear", ());
            }
            WebSocketMessage::NotificationV2(payload) => {
                let payload = payload.into_inner();
                log::trace!("Notification v2: {}", payload.kind);
                let _ = app_handle.emit("vrchat-notification-v2", &payload);
            }
            WebSocketMessage::NotificationV2Update(payload) => {
                let payload = payload.into_inner();
                log::trace!("Notification v2 update: {}", payload.id);
                let _ = app_handle.emit("vrchat-notification-v2-update", &payload);
            }
            WebSocketMessage::NotificationV2Delete(payload) => {
                let payload = payload.into_inner();
                log::trace!("Notification v2 delete: {} ids", payload.ids.len());
                let _ = app_handle.emit("vrchat-notification-v2-delete", &payload);
            }
            WebSocketMessage::FriendAdd(payload) => {
                let content = payload.into_inner();
                log::info!(
                    "Friend added: {} ({})",
                    content.user.display_name,
                    content.user_id
                );
                user_store.upsert_friend(content.user.clone()).await;
                let event = FriendUpdateEvent {
                    user_id: content.user_id.clone(),
                    user: content.user.clone(),
                };
                let _ = app_handle.emit("friend-added", &event);
                let _ = app_handle.emit("friend-update", &event);
            }
            WebSocketMessage::FriendDelete(payload) => {
                let content = payload.into_inner();
                log::info!("Friend removed: {}", content.user_id);
                user_store.remove_friend(&content.user_id).await;
                let event = FriendRemovedEvent {
                    user_id: content.user_id.clone(),
                };
                let _ = app_handle.emit("friend-removed", &event);
            }
            WebSocketMessage::FriendUpdate(payload) => {
                let content = payload.into_inner();
                log::debug!(
                    "Friend updated: {} ({})",
                    content.user.display_name,
                    content.user_id
                );
                user_store.upsert_friend(content.user.clone()).await;
                let event = FriendUpdateEvent {
                    user_id: content.user_id,
                    user: content.user,
                };
                let _ = app_handle.emit("friend-update", &event);
            }
            WebSocketMessage::FriendOnline(payload) => {
                let content = payload.into_inner();
                log::info!(
                    "Friend online: {} ({})",
                    content.user.display_name,
                    content.user_id
                );
                user_store.upsert_friend(content.user.clone()).await;
                if let Some(location) = content.location.clone() {
                    user_store
                        .update_user_location(&content.user_id, location, content.platform.clone())
                        .await;
                }
                let event = FriendOnlineEvent {
                    user_id: content.user_id,
                    user: content.user,
                };
                let _ = app_handle.emit("friend-online", &event);
            }
            WebSocketMessage::FriendActive(payload) => {
                let content = payload.into_inner();
                log::debug!(
                    "Friend active: {} ({})",
                    content.user.display_name,
                    content.user_id
                );
                user_store.upsert_friend(content.user.clone()).await;
                let event = FriendOnlineEvent {
                    user_id: content.user_id.clone(),
                    user: content.user.clone(),
                };
                let _ = app_handle.emit("friend-active", &event);
                let _ = app_handle.emit("friend-online", &event);
            }
            WebSocketMessage::FriendOffline(payload) => {
                let content = payload.into_inner();
                log::info!("Friend offline: {}", content.user_id);
                user_store.set_friend_offline(&content.user_id).await;
                let event = FriendOfflineEvent {
                    user_id: content.user_id,
                };
                let _ = app_handle.emit("friend-offline", &event);
            }
            WebSocketMessage::FriendLocation(payload) => {
                let content = payload.into_inner();
                log::debug!(
                    "Friend location: {} -> {}",
                    content.user_id,
                    content.location
                );
                if let Some(user) = content.user.clone() {
                    user_store.upsert_friend(user).await;
                }
                let platform = content.user.as_ref().map(|friend| friend.platform.clone());
                user_store
                    .update_user_location(&content.user_id, content.location.clone(), platform)
                    .await;
                let _ = app_handle.emit("friend-location", &content);
            }
            WebSocketMessage::UserUpdate(payload) => {
                let content = payload.into_inner();
                log::debug!("Current user update for {}", content.user_id);
                let user = content.user.clone();
                let patch = CurrentUserPipelineUpdate {
                    id: user.id.clone(),
                    display_name: user.display_name.clone(),
                    username: user.username.clone(),
                    status: user.status.clone(),
                    status_description: user.status_description.clone(),
                    bio: user.bio.clone(),
                    user_icon: user.user_icon.clone(),
                    profile_pic_override: user.profile_pic_override.clone(),
                    profile_pic_override_thumbnail: user
                        .profile_pic_override_thumbnail_image_url
                        .clone(),
                    current_avatar: user.current_avatar.clone(),
                    current_avatar_asset_url: user.current_avatar_asset_url.clone(),
                    current_avatar_image_url: user.current_avatar_image_url.clone(),
                    current_avatar_thumbnail_image_url: user
                        .current_avatar_thumbnail_image_url
                        .clone(),
                    fallback_avatar: user.fallback_avatar.clone(),
                    tags: user.tags.clone(),
                };
                user_store.apply_current_user_update(patch).await;
                let _ = app_handle.emit("user-update", &content);
            }
            WebSocketMessage::UserLocation(payload) => {
                let content = payload.into_inner();
                log::debug!(
                    "Current user location: {} -> {}",
                    content.user_id,
                    content.location
                );
                if let Some(user) = content.user.clone() {
                    user_store.upsert_friend(user).await;
                }
                let platform = content.user.as_ref().map(|friend| friend.platform.clone());
                user_store
                    .update_user_location(&content.user_id, content.location.clone(), platform)
                    .await;
                let _ = app_handle.emit("user-location", &content);
            }
            WebSocketMessage::UserBadgeAssigned(payload) => {
                let payload = payload.into_inner();
                log::info!("Badge assigned: {}", payload.badge.badge_id);
                let _ = app_handle.emit("user-badge-assigned", &payload);
            }
            WebSocketMessage::UserBadgeUnassigned(payload) => {
                let payload = payload.into_inner();
                log::info!("Badge unassigned: {}", payload.badge_id);
                let _ = app_handle.emit("user-badge-unassigned", &payload);
            }
            WebSocketMessage::ContentRefresh(payload) => {
                let payload = payload.into_inner();
                log::debug!(
                    "Content refresh: {} {}",
                    payload.content_type,
                    payload.action_type.as_deref().unwrap_or("")
                );
                let _ = app_handle.emit("content-refresh", &payload);
            }
            WebSocketMessage::ModifiedImageUpdate(payload) => {
                let payload = payload.into_inner();
                log::debug!("Image modified: {}", payload.file_id);
                let _ = app_handle.emit("modified-image-update", &payload);
            }
            WebSocketMessage::InstanceQueueJoined(payload) => {
                let payload = payload.into_inner();
                log::info!(
                    "Instance queue joined: {} (position {})",
                    payload.instance_location,
                    payload.position
                );
                let _ = app_handle.emit("instance-queue-joined", &payload);
            }
            WebSocketMessage::InstanceQueueReady(payload) => {
                let payload = payload.into_inner();
                log::info!(
                    "Instance queue ready: {} (expiry {})",
                    payload.instance_location,
                    payload.expiry
                );
                let _ = app_handle.emit("instance-queue-ready", &payload);
            }
            WebSocketMessage::GroupJoined(payload) => {
                let payload = payload.into_inner();
                log::info!("Group joined: {}", payload.group_id);
                let _ = app_handle.emit("group-joined", &payload);
            }
            WebSocketMessage::GroupLeft(payload) => {
                let payload = payload.into_inner();
                log::info!("Group left: {}", payload.group_id);
                let _ = app_handle.emit("group-left", &payload);
            }
            WebSocketMessage::GroupMemberUpdated(payload) => {
                let payload = payload.into_inner();
                log::debug!("Group member updated event received");
                let _ = app_handle.emit("group-member-updated", &payload);
            }
            WebSocketMessage::GroupRoleUpdated(payload) => {
                let payload = payload.into_inner();
                log::debug!("Group role updated event received");
                let _ = app_handle.emit("group-role-updated", &payload);
            }
            WebSocketMessage::Unknown => {
                log::debug!("Unknown WebSocket message type");
            }
        }

        Ok(())
    }
}
