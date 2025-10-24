use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use reqwest::header::HeaderMap;
use reqwest::{Client, Request, RequestBuilder, Response};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, sleep};

use crate::http_common::{INITIAL_BACKOFF, MAX_BACKOFF, MAX_REQUEST_RETRIES};
use crate::vrchat_api::{
    error::{VRCError, VRCResult},
    types::*,
};

const API_BASE_URL: &str = "https://api.vrchat.cloud/api/1";

// Cookie Management
#[derive(Debug, Clone, Default)]
struct CookieStore {
    auth_cookie: Option<String>,
    two_factor_cookie: Option<String>,
}

impl CookieStore {
    fn to_header_value(&self) -> Option<String> {
        let mut parts = Vec::new();

        if let Some(auth) = &self.auth_cookie {
            parts.push(auth.clone());
        }

        if let Some(two_fa) = &self.two_factor_cookie {
            parts.push(two_fa.clone());
        }

        if parts.is_empty() {
            None
        } else {
            Some(parts.join("; "))
        }
    }

    fn update_from_response(&mut self, response: &Response) {
        for cookie_header in response.headers().get_all("set-cookie") {
            if let Ok(cookie_str) = cookie_header.to_str() {
                if let Some(cookie_pair) = cookie_str.split(';').next() {
                    if cookie_pair.starts_with("auth=") {
                        self.auth_cookie = Some(cookie_pair.to_string());
                    } else if cookie_pair.starts_with("twoFactorAuth=") {
                        self.two_factor_cookie = Some(cookie_pair.to_string());
                    }
                }
            }
        }
    }

    fn clear(&mut self) {
        *self = Self::default();
    }

    fn has_auth(&self) -> bool {
        self.auth_cookie.is_some()
    }
}

// VRChat HTTP Client for VRChat API requests
#[derive(Clone)]
pub struct VRChatClient {
    http_client: Client,
    cookies: Arc<Mutex<CookieStore>>,
}

impl VRChatClient {
    /// Create a new VRChat API client
    pub fn new() -> VRCResult<Self> {
        let http_client = Client::builder()
            .cookie_store(false)
            .build()
            .map_err(|e| VRCError::network(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            http_client,
            cookies: Arc::new(Mutex::new(CookieStore::default())),
        })
    }

    // Authentication Methods

    /// Attempt to log in with email and password
    pub async fn login(&self, credentials: &LoginCredentials) -> VRCResult<LoginResult> {
        let auth_header = Self::create_basic_auth(&credentials.email, &credentials.password);
        let headers = self.build_headers(Some(&auth_header), None, None);

        let response = self
            .execute_request(
                self.http_client
                    .get(&format!("{}/auth/user", API_BASE_URL))
                    .headers(headers),
            )
            .await?;

        let mut cookies = self.cookies.lock().await;
        cookies.update_from_response(&response);
        drop(cookies);

        let status = response.status();

        if status == 429 {
            return Err(VRCError::rate_limit(
                "Too many requests. Please wait before trying again.",
            ));
        }

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Login failed".to_string());
            return Err(VRCError::auth(error_text));
        }

        let body = response.text().await?;

        // Check if 2FA is required
        if let Ok(two_fa) = serde_json::from_str::<TwoFactorAuthResponse>(&body) {
            if let Some(methods) = two_fa.requires_two_factor_auth {
                return Ok(LoginResult::TwoFactorRequired { methods });
            }
        }

        let user: User = serde_json::from_str(&body)?;
        Ok(LoginResult::Success { user })
    }

    /// Verify two-factor authentication code
    pub async fn verify_two_factor(&self, code: &str, method: TwoFactorMethod) -> VRCResult<bool> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let headers = self.build_headers(None, None, cookie_header.as_deref());

        let request_body = TwoFactorCode {
            code: code.to_string(),
        };

        let response = self
            .execute_request(
                self.http_client
                    .post(&format!(
                        "{}/auth/twofactorauth/{}/verify",
                        API_BASE_URL,
                        method.endpoint()
                    ))
                    .headers(headers)
                    .json(&request_body),
            )
            .await?;

        let status = response.status();

        let mut cookies = self.cookies.lock().await;
        cookies.update_from_response(&response);
        drop(cookies);

        if status == 429 {
            return Err(VRCError::rate_limit(
                "Too many requests. Please wait before trying again.",
            ));
        }

        if !status.is_success() && status.as_u16() != 400 {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Verification failed".to_string());
            return Err(VRCError::auth(error_text));
        }

        let body = response.text().await?;
        let verify_response: TwoFactorVerifyResponse = serde_json::from_str(&body)?;

        Ok(verify_response.verified)
    }

    /// Get the currently authenticated user
    pub async fn get_current_user(&self) -> VRCResult<User> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let headers = self.build_headers(None, None, cookie_header.as_deref());

        let response = self
            .execute_request(
                self.http_client
                    .get(&format!("{}/auth/user", API_BASE_URL))
                    .headers(headers),
            )
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to get user".to_string());
            return Err(VRCError::http(status.as_u16(), error_text));
        }

        let body = response.text().await?;
        let user: User = serde_json::from_str(&body)?;

        Ok(user)
    }

    /// Update the user's status and status description
    pub async fn update_status(&self, request: &UpdateStatusRequest) -> VRCResult<User> {
        // First get current user to get their userId
        let current_user = self.get_current_user().await?;

        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let cookie = cookie_header.ok_or_else(|| VRCError::auth("Not authenticated"))?;
        let headers = self.build_headers(None, None, Some(&cookie));

        let response = self
            .execute_request(
                self.http_client
                    .put(&format!("{}/users/{}", API_BASE_URL, current_user.id))
                    .headers(headers)
                    .json(request),
            )
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to update status".to_string());
            return Err(VRCError::http(status.as_u16(), error_text));
        }

        let user: User = response.json().await?;
        Ok(user)
    }

    /// Log out the current user
    pub async fn logout(&self) -> VRCResult<()> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        if let Some(cookie) = cookie_header {
            let headers = self.build_headers(None, None, Some(&cookie));

            let _ = self
                .execute_request(
                    self.http_client
                        .put(&format!("{}/logout", API_BASE_URL))
                        .headers(headers),
                )
                .await;
        }

        let mut cookies = self.cookies.lock().await;
        cookies.clear();

        Ok(())
    }

    /// Get online friends list
    pub async fn get_online_friends(&self) -> VRCResult<Vec<LimitedUserFriend>> {
        self.fetch_friends(false).await
    }

    pub async fn get_all_friends(&self) -> VRCResult<Vec<LimitedUserFriend>> {
        let mut combined = Vec::new();
        let mut seen = HashSet::new();

        let mut online = self.fetch_friends(false).await?;
        for friend in online.drain(..) {
            seen.insert(friend.id.clone());
            combined.push(friend);
        }

        let mut offline = self.fetch_friends(true).await?;
        for friend in offline.drain(..) {
            if seen.insert(friend.id.clone()) {
                combined.push(friend);
            }
        }

        Ok(combined)
    }

    async fn fetch_friends(&self, offline: bool) -> VRCResult<Vec<LimitedUserFriend>> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let cookie = cookie_header.ok_or_else(|| VRCError::auth("Not authenticated"))?;
        let mut results = Vec::new();
        let mut offset = 0usize;
        const PAGE_SIZE: usize = 100;

        loop {
            let headers = self.build_headers(None, None, Some(&cookie));
            let response = self
                .execute_request(
                    self.http_client
                        .get(&format!(
                            "{}/auth/user/friends?offline={}&n={}&offset={}",
                            API_BASE_URL, offline, PAGE_SIZE, offset
                        ))
                        .headers(headers),
                )
                .await?;

            if !response.status().is_success() {
                return Err(VRCError::http(
                    response.status().as_u16(),
                    "Failed to fetch friends",
                ));
            }

            let page: Vec<LimitedUserFriend> = response.json().await?;
            let count = page.len();
            if count == 0 {
                break;
            }

            results.extend(page.into_iter());

            if count < PAGE_SIZE {
                break;
            }

            sleep(Duration::from_secs(1)).await;
            offset += PAGE_SIZE;
        }

        Ok(results)
    }

    /// Fetch all worlds uploaded by the authenticated user
    pub async fn get_uploaded_worlds(&self) -> VRCResult<Vec<LimitedWorld>> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let cookie = cookie_header.ok_or_else(|| VRCError::auth("Not authenticated"))?;
        let mut worlds = Vec::new();
        let mut offset: usize = 0;
        const PAGE_SIZE: usize = 100;

        loop {
            let headers = self.build_headers(None, None, Some(&cookie));
            let url = format!(
                "{}/worlds?user=me&n={}&offset={}&order=descending&sort=updated",
                API_BASE_URL, PAGE_SIZE, offset
            );

            let response = self
                .execute_request(self.http_client.get(&url).headers(headers))
                .await?;

            if !response.status().is_success() {
                return Err(VRCError::http(
                    response.status().as_u16(),
                    "Failed to fetch uploaded worlds",
                ));
            }

            let mut page: Vec<LimitedWorld> = response.json().await?;
            let count = page.len();

            if count == 0 {
                break;
            }

            // Backfill statistics that might be missing from the list endpoint
            for idx in 0..page.len() {
                if page[idx].visits.is_none()
                    || page[idx].favorites.is_none()
                    || page[idx].popularity.is_none()
                    || page[idx].occupants.is_none()
                    || page[idx].capacity.is_none()
                    || page[idx].recommended_capacity.is_none()
                {
                    match self.get_world_details(&page[idx].id).await {
                        Ok(details) => {
                            if details.visits.is_some() {
                                page[idx].visits = details.visits;
                            }
                            if details.favorites.is_some() {
                                page[idx].favorites = details.favorites;
                            }
                            if details.popularity.is_some() {
                                page[idx].popularity = details.popularity;
                            }
                            if details.occupants.is_some() {
                                page[idx].occupants = details.occupants;
                            }
                            if details.capacity.is_some() {
                                page[idx].capacity = details.capacity;
                            }
                            if details.recommended_capacity.is_some() {
                                page[idx].recommended_capacity = details.recommended_capacity;
                            }
                            if details.heat.is_some() {
                                page[idx].heat = details.heat;
                            }
                            if details.organization.is_some() {
                                page[idx].organization = details.organization;
                            }
                        }
                        Err(err) => {
                            log::warn!(
                                "Failed to load additional details for world {}: {}",
                                page[idx].id,
                                err
                            );
                        }
                    }
                }
            }

            offset += count;
            worlds.append(&mut page);

            if count < PAGE_SIZE {
                break;
            }
        }

        Ok(worlds)
    }

    /// Fetch all avatars uploaded by the authenticated user
    pub async fn get_uploaded_avatars(&self) -> VRCResult<Vec<LimitedAvatar>> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let cookie = cookie_header.ok_or_else(|| VRCError::auth("Not authenticated"))?;
        let mut avatars = Vec::new();
        let mut offset: usize = 0;
        const PAGE_SIZE: usize = 100;

        loop {
            let headers = self.build_headers(None, None, Some(&cookie));
            let url = format!(
                "{}/avatars?user=me&releaseStatus=all&sort=updated&order=descending&n={}&offset={}",
                API_BASE_URL, PAGE_SIZE, offset
            );

            let response = self
                .execute_request(self.http_client.get(&url).headers(headers))
                .await?;

            if !response.status().is_success() {
                return Err(VRCError::http(
                    response.status().as_u16(),
                    "Failed to fetch uploaded avatars",
                ));
            }

            let mut page: Vec<LimitedAvatar> = response.json().await?;
            let count = page.len();

            if count == 0 {
                break;
            }

            offset += count;
            avatars.append(&mut page);

            if count < PAGE_SIZE {
                break;
            }
        }

        Ok(avatars)
    }

    // TODO: Have to analyses consequences of rate limits when fetching world details in a loop
    /// Fetch additional details for a specific world
    pub async fn get_world_details(&self, world_id: &str) -> VRCResult<LimitedWorld> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let cookie = cookie_header.ok_or_else(|| VRCError::auth("Not authenticated"))?;
        let headers = self.build_headers(None, None, Some(&cookie));

        let response = self
            .execute_request(
                self.http_client
                    .get(&format!("{}/worlds/{}", API_BASE_URL, world_id))
                    .headers(headers),
            )
            .await?;

        if !response.status().is_success() {
            return Err(VRCError::http(
                response.status().as_u16(),
                format!("Failed to fetch world {}", world_id),
            ));
        }

        let world: LimitedWorld = response.json().await?;
        Ok(world)
    }

    /// Fetch full user data by user ID
    pub async fn get_user_by_id(&self, user_id: &str) -> VRCResult<User> {
        let cookie_header = {
            let cookies = self.cookies.lock().await;
            cookies.to_header_value()
        };

        let cookie = cookie_header.ok_or_else(|| VRCError::auth("Not authenticated"))?;
        let headers = self.build_headers(None, None, Some(&cookie));

        let response = self
            .execute_request(
                self.http_client
                    .get(&format!("{}/users/{}", API_BASE_URL, user_id))
                    .headers(headers),
            )
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unable to read error response".to_string());
            log::error!(
                "Failed to fetch user {}: HTTP {} - {}",
                user_id,
                status.as_u16(),
                error_body
            );
            return Err(VRCError::http(
                status.as_u16(),
                format!("Failed to fetch user {}: {}", user_id, error_body),
            ));
        }

        let body = response.text().await?;
        log::debug!("User API response for {}: {}", user_id, body);

        let user: User = serde_json::from_str(&body).map_err(|e| {
            log::error!("Failed to parse user JSON: {}", e);
            VRCError::unknown(format!("Failed to parse user data: {}", e))
        })?;

        Ok(user)
    }

    // Session Management

    /// Check if the client has a valid session
    pub async fn has_valid_session(&self) -> bool {
        let cookies = self.cookies.lock().await;
        cookies.has_auth()
    }

    /// Export cookies for storage
    pub async fn export_cookies(&self) -> (Option<String>, Option<String>) {
        let cookies = self.cookies.lock().await;
        (
            cookies.auth_cookie.clone(),
            cookies.two_factor_cookie.clone(),
        )
    }

    /// Import previously stored cookies
    pub async fn import_cookies(&self, auth: Option<String>, two_factor: Option<String>) {
        let mut cookies = self.cookies.lock().await;
        cookies.auth_cookie = auth;
        cookies.two_factor_cookie = two_factor;
    }

    /// Clear all stored cookies
    pub async fn clear_cookies(&self) {
        let mut cookies = self.cookies.lock().await;
        cookies.clear();
    }

    // Private Helper Methods

    fn create_basic_auth(email: &str, password: &str) -> String {
        let credentials = format!("{}:{}", email, password);
        let encoded = BASE64.encode(credentials.as_bytes());
        format!("Basic {}", encoded)
    }

    fn build_headers(
        &self,
        auth: Option<&str>,
        _referer: Option<&str>,
        cookie: Option<&str>,
    ) -> HeaderMap {
        crate::http_common::build_api_headers(auth, cookie)
    }

    async fn execute_request(&self, builder: RequestBuilder) -> VRCResult<Response> {
        let request = builder
            .build()
            .map_err(|e| VRCError::network(format!("Failed to build request: {}", e)))?;
        self.send_with_retry(request).await
    }

    async fn send_with_retry(&self, request: Request) -> VRCResult<Response> {
        let mut attempt: u8 = 0;
        let mut backoff = Duration::from_millis(INITIAL_BACKOFF);

        loop {
            let req = request
                .try_clone()
                .ok_or_else(|| VRCError::network("Failed to clone request for retry attempts"))?;

            match self.http_client.execute(req).await {
                Ok(response) => {
                    let status = response.status();

                    if status.as_u16() == 429 {
                        if attempt >= MAX_REQUEST_RETRIES {
                            return Err(VRCError::rate_limit(
                                "Too many requests. Please wait before trying again.",
                            ));
                        }

                        let wait = Self::extract_retry_after(&response).unwrap_or(backoff);
                        drop(response);
                        sleep(wait).await;
                        attempt += 1;
                        backoff = (backoff * 2).min(Duration::from_millis(MAX_BACKOFF));
                        continue;
                    }

                    if status.is_server_error() {
                        if attempt >= MAX_REQUEST_RETRIES {
                            return Err(VRCError::http(
                                status.as_u16(),
                                status
                                    .canonical_reason()
                                    .unwrap_or("Server error")
                                    .to_string(),
                            ));
                        }

                        let wait = Self::extract_retry_after(&response).unwrap_or(backoff);
                        drop(response);
                        sleep(wait).await;
                        attempt += 1;
                        backoff = (backoff * 2).min(Duration::from_millis(MAX_BACKOFF));
                        continue;
                    }

                    return Ok(response);
                }
                Err(err) => {
                    if attempt >= MAX_REQUEST_RETRIES {
                        return Err(VRCError::network(format!(
                            "Request failed after retries: {}",
                            err
                        )));
                    }

                    sleep(backoff).await;
                    attempt += 1;
                    backoff = (backoff * 2).min(Duration::from_millis(MAX_BACKOFF));
                }
            }
        }
    }

    fn extract_retry_after(response: &Response) -> Option<Duration> {
        response
            .headers()
            .get("retry-after")
            .and_then(|value| value.to_str().ok())
            .and_then(|header| header.parse::<u64>().ok())
            .map(Duration::from_secs)
    }
}

impl Default for VRChatClient {
    fn default() -> Self {
        Self::new().expect("Failed to create default VRChatClient")
    }
}
