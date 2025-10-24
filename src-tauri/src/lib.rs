pub mod database_studio;
pub mod http_common;
pub mod log_manager;
pub mod store;
pub mod vrchat_api;
pub mod vrchat_status;
pub mod websocket;

use database_studio::{ColumnInfo, DatabaseStudio, QueryResult, TableInfo};
use log::info;
use log_manager::{LogEntry, LogManager};
use std::sync::Arc;
use store::{AccountStore, AppSettings, ImageCacheStore, SettingsStore, StoredAccount, UserStore};
use tauri::{Manager, State};
use tauri_specta::{Builder as SpectaBuilder, collect_commands};
use tokio::sync::Mutex;
use vrchat_api::{
    AgeVerificationStatus, AvatarPerformance, AvatarStyles, Badge, DeveloperType, DiscordDetails,
    FriendRequestStatus, GoogleDetails, LimitedAvatar, LimitedUserFriend, LimitedWorld,
    LoginCredentials, LoginResult, OrderOption, PastDisplayName, PerformanceRatings, ReleaseStatus,
    SteamDetails, TwoFactorMethod, UnityPackageSummary, UpdateStatusRequest, User, UserState,
    UserStatus, VRCError, VRChatClient,
};
use vrchat_status::{StatusPage, SystemStatus, VRChatStatusResponse};
use websocket::VRChatWebSocket;

#[cfg(debug_assertions)]
use specta_typescript::Typescript;

// Application State
struct AppState {
    vrchat_client: Arc<Mutex<VRChatClient>>,
    account_store: AccountStore,
    websocket: Arc<Mutex<VRChatWebSocket>>,
    user_store: UserStore,
    settings_store: SettingsStore,
    #[allow(dead_code)]
    image_cache: Arc<ImageCacheStore>,
}

// VRChat API Commands
#[tauri::command]
#[specta::specta]
async fn vrchat_login(
    email: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<LoginResult, VRCError> {
    let credentials = LoginCredentials { email, password };
    let client = state.vrchat_client.lock().await;

    client.login(&credentials).await
}

#[tauri::command]
#[specta::specta]
async fn vrchat_verify_2fa(
    code: String,
    method: String,
    state: State<'_, AppState>,
) -> Result<bool, VRCError> {
    let two_fa_method = TwoFactorMethod::from_str(&method)
        .ok_or_else(|| VRCError::invalid_input(format!("Invalid 2FA method: {}", method)))?;

    let client = state.vrchat_client.lock().await;

    client.verify_two_factor(&code, two_fa_method).await
}

#[tauri::command]
#[specta::specta]
async fn vrchat_get_current_user(state: State<'_, AppState>) -> Result<User, VRCError> {
    if let Some(user) = state.user_store.get_current_user().await {
        return Ok(user);
    }

    let client = state.vrchat_client.lock().await;
    let user = client.get_current_user().await?;

    state.user_store.set_current_user(user.clone()).await;

    Ok(user)
}

#[tauri::command]
#[specta::specta]
async fn vrchat_update_status(
    status: UserStatus,
    status_description: String,
    state: State<'_, AppState>,
) -> Result<User, VRCError> {
    let request = UpdateStatusRequest {
        status,
        status_description,
    };

    let client = state.vrchat_client.lock().await;
    let user = client.update_status(&request).await?;
    drop(client);

    state.user_store.set_current_user(user.clone()).await;

    Ok(user)
}

#[tauri::command]
#[specta::specta]
async fn vrchat_logout(state: State<'_, AppState>) -> Result<(), VRCError> {
    let websocket = state.websocket.lock().await;
    websocket.stop().await;
    drop(websocket);

    state.user_store.clear_all().await;

    let client = state.vrchat_client.lock().await;
    client.logout().await
}

#[tauri::command]
#[specta::specta]
async fn websocket_start(state: State<'_, AppState>) -> Result<(), VRCError> {
    let client = state.vrchat_client.lock().await;
    let (auth_cookie, two_factor_cookie) = client.export_cookies().await;
    drop(client);

    log::debug!(
        "WebSocket starting with cookies - auth: {:?}, 2fa: {:?}",
        auth_cookie
            .as_ref()
            .map(|c| format!("{}...", &c.chars().take(20).collect::<String>())),
        two_factor_cookie
            .as_ref()
            .map(|c| format!("{}...", &c.chars().take(20).collect::<String>()))
    );

    let websocket = state.websocket.lock().await;
    websocket.set_cookies(auth_cookie, two_factor_cookie).await;
    websocket.start().await
}

#[tauri::command]
#[specta::specta]
async fn websocket_stop(state: State<'_, AppState>) -> Result<(), VRCError> {
    let websocket = state.websocket.lock().await;
    websocket.stop().await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
async fn vrchat_get_online_friends(
    state: State<'_, AppState>,
) -> Result<Vec<LimitedUserFriend>, VRCError> {
    let cached_friends = state.user_store.get_all_friends().await;

    if !cached_friends.is_empty() {
        return Ok(cached_friends);
    }

    let client = state.vrchat_client.lock().await;
    let friends = client.get_all_friends().await?;

    state.user_store.set_friends(friends.clone()).await;
    Ok(friends)
}

#[tauri::command]
#[specta::specta]
async fn vrchat_get_uploaded_worlds(
    state: State<'_, AppState>,
) -> Result<Vec<LimitedWorld>, VRCError> {
    let client = state.vrchat_client.lock().await;
    client.get_uploaded_worlds().await
}

#[tauri::command]
#[specta::specta]
async fn vrchat_get_uploaded_avatars(
    state: State<'_, AppState>,
) -> Result<Vec<LimitedAvatar>, VRCError> {
    let client = state.vrchat_client.lock().await;
    client.get_uploaded_avatars().await
}

#[tauri::command]
#[specta::specta]
async fn get_online_friends(
    state: State<'_, AppState>,
) -> Result<Vec<LimitedUserFriend>, VRCError> {
    Ok(state.user_store.get_all_friends().await)
}

#[tauri::command]
#[specta::specta]
async fn check_image_cached(
    url: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, VRCError> {
    if url.trim().is_empty() {
        return Ok(None);
    }

    let cache = state.image_cache.clone();
    if let Some(path) = cache.get_cached_path(&url).await {
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
#[specta::specta]
async fn cache_image(url: String, state: State<'_, AppState>) -> Result<String, VRCError> {
    if url.trim().is_empty() {
        return Err(VRCError::invalid_input("Image URL is empty".to_string()));
    }

    info!("Caching image: {}", url);

    let client = state.vrchat_client.lock().await;
    let (auth_cookie, two_factor_cookie) = client.export_cookies().await;
    drop(client);

    let cookies = match (auth_cookie, two_factor_cookie) {
        (Some(auth), Some(two_fa)) => Some(format!("{}; {}", auth, two_fa)),
        (Some(auth), None) => Some(auth),
        (None, Some(two_fa)) => Some(two_fa),
        (None, None) => None,
    };

    let cache = state.image_cache.clone();
    let path = cache
        .get_or_fetch(&url, cookies)
        .await
        .map_err(VRCError::unknown)?;
    info!("Image cached to: {}", path.display());

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
async fn get_cache_directory(state: State<'_, AppState>) -> Result<String, VRCError> {
    let cache = state.image_cache.clone();
    let dir = cache.get_cache_dir();
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
async fn get_all_friends(state: State<'_, AppState>) -> Result<Vec<LimitedUserFriend>, VRCError> {
    Ok(state.user_store.get_all_friends().await)
}

#[tauri::command]
#[specta::specta]
async fn get_user(
    user_id: String,
    state: State<'_, AppState>,
) -> Result<Option<LimitedUserFriend>, VRCError> {
    Ok(state.user_store.get_user(&user_id).await)
}

#[tauri::command]
#[specta::specta]
async fn get_user_by_id(user_id: String, state: State<'_, AppState>) -> Result<User, VRCError> {
    if let Some(cached_user) = state.user_store.get_full_user(&user_id).await {
        log::debug!("get_user_by_id: Returning cached user for {}", user_id);
        return Ok(cached_user);
    }

    log::info!("get_user_by_id: Fetching user {} from API", user_id);

    let client = state.vrchat_client.lock().await;
    let user = client.get_user_by_id(&user_id).await?;
    drop(client);

    log::info!("get_user_by_id: Successfully fetched user {}", user_id);

    state.user_store.cache_full_user(user.clone()).await;

    Ok(user)
}

#[tauri::command]
#[specta::specta]
async fn is_friend(user_id: String, state: State<'_, AppState>) -> Result<bool, VRCError> {
    Ok(state.user_store.is_friend(&user_id).await)
}

#[tauri::command]
#[specta::specta]
async fn is_user_online(user_id: String, state: State<'_, AppState>) -> Result<bool, VRCError> {
    Ok(state.user_store.is_user_online(&user_id).await)
}

#[tauri::command]
#[specta::specta]
async fn vrchat_check_session(state: State<'_, AppState>) -> Result<bool, VRCError> {
    let client = state.vrchat_client.lock().await;
    Ok(client.has_valid_session().await)
}

#[tauri::command]
#[specta::specta]
async fn vrchat_clear_session(state: State<'_, AppState>) -> Result<(), VRCError> {
    let client = state.vrchat_client.lock().await;
    client.clear_cookies().await;
    drop(client);

    state.user_store.clear_all().await;

    state
        .account_store
        .clear_last_active_account()
        .await
        .map_err(|e| VRCError::unknown(e))?;

    Ok(())
}

// Account Management Commands
#[tauri::command]
#[specta::specta]
async fn save_current_account(user: User, state: State<'_, AppState>) -> Result<(), VRCError> {
    let client = state.vrchat_client.lock().await;
    let (auth_cookie, two_factor_cookie) = client.export_cookies().await;

    let avatar_override = user
        .user_icon
        .clone()
        .or_else(|| user.profile_pic_override.clone())
        .or_else(|| user.profile_pic_override_thumbnail.clone());

    let avatar_fallback = user
        .current_avatar_thumbnail_image_url
        .clone()
        .or_else(|| user.current_avatar_image_url.clone());

    let account = StoredAccount {
        user_id: user.id.clone(),
        username: user.username.clone(),
        display_name: user.display_name.clone(),
        avatar_url: avatar_override.clone().or_else(|| avatar_fallback.clone()),
        avatar_fallback_url: avatar_fallback,
        auth_cookie,
        two_factor_cookie,
        last_login: chrono::Utc::now().to_rfc3339(),
    };

    state
        .account_store
        .save_account(account)
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn get_all_accounts(state: State<'_, AppState>) -> Result<Vec<StoredAccount>, VRCError> {
    state
        .account_store
        .get_all_accounts()
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn switch_account(user_id: String, state: State<'_, AppState>) -> Result<User, VRCError> {
    state.user_store.clear_all().await;

    let account = state
        .account_store
        .get_account(&user_id)
        .await
        .map_err(|e| VRCError::unknown(e))?
        .ok_or_else(|| VRCError::invalid_input("Account not found"))?;

    state
        .account_store
        .set_active_account(&user_id)
        .await
        .map_err(|e| VRCError::unknown(e))?;

    let client = state.vrchat_client.lock().await;
    client
        .import_cookies(account.auth_cookie, account.two_factor_cookie)
        .await;

    match client.get_current_user().await {
        Ok(user) => {
            state.user_store.set_current_user(user.clone()).await;
            Ok(user)
        }
        Err(err) => {
            // TODO: Handle if switching account fails
            Err(err)
        }
    }
}

#[tauri::command]
#[specta::specta]
async fn remove_account(user_id: String, state: State<'_, AppState>) -> Result<(), VRCError> {
    state
        .account_store
        .remove_account(&user_id)
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn clear_all_accounts(state: State<'_, AppState>) -> Result<(), VRCError> {
    state
        .account_store
        .clear_all_accounts()
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn load_last_account(state: State<'_, AppState>) -> Result<Option<User>, VRCError> {
    let account = match state
        .account_store
        .get_last_active_account()
        .await
        .map_err(|e| VRCError::unknown(e))?
    {
        Some(acc) => acc,
        None => return Ok(None),
    };

    let client = state.vrchat_client.lock().await;
    client
        .import_cookies(account.auth_cookie, account.two_factor_cookie)
        .await;

    match client.get_current_user().await {
        Ok(user) => Ok(Some(user)),
        Err(_) => {
            // TODO: Handle if last account cannot be loaded
            // client.clear_cookies().await;
            Ok(None)
        }
    }
}

// Settings Commands
#[tauri::command]
#[specta::specta]
async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, VRCError> {
    state
        .settings_store
        .get_settings()
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn save_settings(settings: AppSettings, state: State<'_, AppState>) -> Result<(), VRCError> {
    info!(
        "Saving settings: developer_mode={}",
        settings.developer_mode
    );
    state
        .settings_store
        .save_settings(settings)
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn get_developer_mode(state: State<'_, AppState>) -> Result<bool, VRCError> {
    state
        .settings_store
        .get_developer_mode()
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn set_developer_mode(enabled: bool, state: State<'_, AppState>) -> Result<(), VRCError> {
    info!("Setting developer mode: {}", enabled);
    state
        .settings_store
        .set_developer_mode(enabled)
        .await
        .map_err(|e| VRCError::unknown(e))
}

// Log Commands
#[tauri::command]
#[specta::specta]
async fn get_backend_logs() -> Result<Vec<LogEntry>, VRCError> {
    LogManager::read_logs().map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn clear_backend_logs() -> Result<(), VRCError> {
    info!("Clearing backend logs");
    LogManager::clear_logs().map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn export_backend_logs() -> Result<String, VRCError> {
    LogManager::export_logs().map_err(|e| VRCError::unknown(e))
}

// VRChat Service Status Commands
#[tauri::command]
#[specta::specta]
async fn get_vrchat_status() -> Result<VRChatStatusResponse, String> {
    vrchat_status::fetch_vrchat_status().await
}

// Database Studio Commands
#[tauri::command]
#[specta::specta]
async fn db_list_tables() -> Result<Vec<TableInfo>, VRCError> {
    let studio = DatabaseStudio::new()
        .await
        .map_err(|e| VRCError::unknown(e))?;

    studio.list_tables().await.map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn db_get_table_schema(table_name: String) -> Result<Vec<ColumnInfo>, VRCError> {
    let studio = DatabaseStudio::new()
        .await
        .map_err(|e| VRCError::unknown(e))?;

    studio
        .get_table_schema(&table_name)
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn db_get_table_data(
    table_name: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<QueryResult, VRCError> {
    let studio = DatabaseStudio::new()
        .await
        .map_err(|e| VRCError::unknown(e))?;

    studio
        .get_table_data(&table_name, limit, offset)
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn db_get_table_count(table_name: String) -> Result<i32, VRCError> {
    let studio = DatabaseStudio::new()
        .await
        .map_err(|e| VRCError::unknown(e))?;

    studio
        .get_table_count(&table_name)
        .await
        .map_err(|e| VRCError::unknown(e))
}

#[tauri::command]
#[specta::specta]
async fn db_execute_query(query: String) -> Result<QueryResult, VRCError> {
    let studio = DatabaseStudio::new()
        .await
        .map_err(|e| VRCError::unknown(e))?;

    studio
        .execute_query(&query)
        .await
        .map_err(|e| VRCError::unknown(e))
}

// Binding Generation
fn create_specta_builder() -> SpectaBuilder<tauri::Wry> {
    SpectaBuilder::<tauri::Wry>::new()
        .commands(collect_commands![
            vrchat_login,
            vrchat_verify_2fa,
            vrchat_get_current_user,
            vrchat_update_status,
            vrchat_logout,
            vrchat_get_online_friends,
            vrchat_get_uploaded_worlds,
            vrchat_get_uploaded_avatars,
            get_online_friends,
            get_all_friends,
            get_user,
            get_user_by_id,
            is_friend,
            is_user_online,
            vrchat_check_session,
            vrchat_clear_session,
            websocket_start,
            websocket_stop,
            save_current_account,
            get_all_accounts,
            switch_account,
            remove_account,
            clear_all_accounts,
            load_last_account,
            get_settings,
            save_settings,
            get_developer_mode,
            set_developer_mode,
            get_backend_logs,
            clear_backend_logs,
            export_backend_logs,
            get_vrchat_status,
            db_list_tables,
            db_get_table_schema,
            db_get_table_data,
            db_get_table_count,
            db_execute_query,
            check_image_cached,
            cache_image,
            get_cache_directory,
        ])
        // Core VRChat API types
        .typ::<VRCError>()
        .typ::<User>()
        .typ::<LoginResult>()
        .typ::<UpdateStatusRequest>()
        // Enum types
        .typ::<UserStatus>()
        .typ::<ReleaseStatus>()
        .typ::<DeveloperType>()
        .typ::<AgeVerificationStatus>()
        .typ::<FriendRequestStatus>()
        .typ::<UserState>()
        .typ::<PerformanceRatings>()
        .typ::<OrderOption>()
        // User-related types
        .typ::<LimitedUserFriend>()
        .typ::<PastDisplayName>()
        .typ::<Badge>()
        .typ::<DiscordDetails>()
        .typ::<GoogleDetails>()
        .typ::<SteamDetails>()
        // World types
        .typ::<LimitedWorld>()
        .typ::<UnityPackageSummary>()
        // Avatar types
        .typ::<LimitedAvatar>()
        .typ::<AvatarPerformance>()
        .typ::<AvatarStyles>()
        // Store types
        .typ::<StoredAccount>()
        .typ::<AppSettings>()
        // Log types
        .typ::<LogEntry>()
        // Database types
        .typ::<TableInfo>()
        .typ::<ColumnInfo>()
        .typ::<QueryResult>()
        // Status types
        .typ::<VRChatStatusResponse>()
        .typ::<SystemStatus>()
        .typ::<StatusPage>()
}

pub fn generate_bindings() {
    use std::{fs, fs::File, io::Write};
    eprintln!("Generating TypeScript bindings...");

    let specta_builder = create_specta_builder();
    let formatter = Typescript::default();
    let bindings = specta_builder
        .export_str(&formatter)
        .expect("Failed to generate TypeScript bindings");
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let output_path = manifest_dir
        .join("..")
        .join("src")
        .join("types")
        .join("bindings.ts");

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).expect("Failed to create bindings directory");
    }

    let mut file = File::create(&output_path).expect("Failed to create TypeScript bindings file");
    file.write_all(
        b"// @ts-nocheck\n// This file is auto-generated by Specta. Do not edit manually.\n\n",
    )
    .expect("Failed to write bindings header");
    file.write_all(bindings.as_bytes())
        .expect("Failed to write TypeScript bindings");

    formatter.format(&output_path).ok();
    eprintln!(
        "Successfully generated bindings at {}",
        output_path.display()
    );
}

// Application Entry Point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let specta_builder = create_specta_builder();

    #[cfg(debug_assertions)]
    {
        eprintln!("Auto-generating TypeScript bindings in development mode...");
        generate_bindings();
    }

    let vrchat_client = VRChatClient::new().expect("Failed to create VRChat client");
    let account_store =
        tauri::async_runtime::block_on(AccountStore::new()).expect("Failed to create AccountStore");
    let settings_store = tauri::async_runtime::block_on(SettingsStore::new())
        .expect("Failed to create SettingsStore");
    let image_cache = Arc::new(
        tauri::async_runtime::block_on(ImageCacheStore::new())
            .expect("Failed to create ImageCacheStore"),
    );
    let user_store = UserStore::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("vrc-circle".to_string()),
                    },
                ))
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app| {
            // Initialize WebSocket with app handle and UserStore
            let websocket = VRChatWebSocket::new(app.handle().clone(), user_store.clone());

            let app_state = AppState {
                vrchat_client: Arc::new(Mutex::new(vrchat_client)),
                account_store,
                websocket: Arc::new(Mutex::new(websocket)),
                user_store,
                settings_store,
                image_cache: image_cache.clone(),
            };

            app.manage(app_state);
            specta_builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
