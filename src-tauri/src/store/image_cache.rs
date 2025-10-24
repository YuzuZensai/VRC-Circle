use crate::http_common::{
    INITIAL_BACKOFF as INITIAL_BACKOFF_MS, MAX_BACKOFF as MAX_BACKOFF_MS, MAX_DOWNLOADS_PER_SECOND,
    MAX_REQUEST_RETRIES, USER_AGENT_STRING,
};
use reqwest::{
    Client,
    header::{COOKIE, USER_AGENT},
};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;
use tokio::time::sleep;

const INITIAL_BACKOFF: Duration = Duration::from_millis(INITIAL_BACKOFF_MS);
const MAX_BACKOFF: Duration = Duration::from_millis(MAX_BACKOFF_MS);

pub struct ImageCacheStore {
    base_dir: PathBuf,
    client: Client,
    in_flight: Arc<Mutex<HashSet<String>>>,
    rate_limiter: Arc<Mutex<RateLimiter>>,
}

struct RateLimiter {
    last_reset: Instant,
    tokens: u32,
    max_tokens: u32,
}

impl RateLimiter {
    fn new(max_tokens: u32) -> Self {
        Self {
            last_reset: Instant::now(),
            tokens: max_tokens,
            max_tokens,
        }
    }

    async fn acquire(&mut self) {
        loop {
            // Refill tokens if duration has passed
            let now = Instant::now();
            if now.duration_since(self.last_reset) >= Duration::from_secs(1) {
                self.tokens = self.max_tokens;
                self.last_reset = now;
            }

            // If we have tokens, consume one and return
            if self.tokens > 0 {
                self.tokens -= 1;
                return;
            }

            // Otherwise, sleep until the next refill
            let time_until_refill =
                Duration::from_secs(1).saturating_sub(now.duration_since(self.last_reset));
            if time_until_refill > Duration::from_millis(0) {
                sleep(time_until_refill).await;
            }
        }
    }
}

impl ImageCacheStore {
    pub async fn new() -> Result<Self, String> {
        // Use per-user local data directory (this is %LOCALAPPDATA% on Windows)
        let base_dir = dirs::data_local_dir()
            .ok_or("Failed to resolve local data directory")?
            .join("vrc-circle");

        let cache_dir = base_dir.join("cache").join("files");

        log::info!("Image cache directory: {}", cache_dir.display());

        fs::create_dir_all(&cache_dir)
            .await
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;

        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| format!("Failed to create cache HTTP client: {}", e))?;

        Ok(Self {
            base_dir: cache_dir,
            client,
            in_flight: Arc::new(Mutex::new(HashSet::new())),
            rate_limiter: Arc::new(Mutex::new(RateLimiter::new(MAX_DOWNLOADS_PER_SECOND))),
        })
    }

    pub fn get_cache_dir(&self) -> &Path {
        &self.base_dir
    }

    pub async fn get_cached_path(&self, url: &str) -> Option<PathBuf> {
        if url.trim().is_empty() {
            return None;
        }

        let (file_name, extension) = Self::hash_filename(url);
        let mut file_path = self.base_dir.join(&file_name);
        if let Some(ext) = extension {
            file_path.set_extension(ext);
        }

        if fs::metadata(&file_path).await.is_ok() {
            Some(file_path)
        } else {
            None
        }
    }

    pub async fn get_or_fetch(
        &self,
        url: &str,
        auth_cookies: Option<String>,
    ) -> Result<PathBuf, String> {
        log::info!("[CACHE] get_or_fetch called for: {}", url);

        if url.trim().is_empty() {
            return Err("Image URL is empty".to_string());
        }

        let (file_name, extension) = Self::hash_filename(url);
        let mut file_path = self.base_dir.join(&file_name);
        if let Some(ext) = extension {
            file_path.set_extension(ext);
        }

        log::info!("[CACHE] Computed file path: {}", file_path.display());

        // If cache hit
        if fs::metadata(&file_path).await.is_ok() {
            log::info!("[CACHE] HIT: {}", file_path.display());
            return Ok(file_path);
        }

        // Rate limiter, wait for a token before acquiring the in-flight lock
        {
            let mut limiter = self.rate_limiter.lock().await;
            limiter.acquire().await;
        }

        // Deduplicate, if another download is in progress for this URL, wait for it to complete
        {
            let mut in_flight = self.in_flight.lock().await;
            if in_flight.contains(url) {
                drop(in_flight);
                log::debug!("Download already in progress for: {}, waiting...", url);

                // Poll for status
                for _ in 0..60 {
                    // Wait up to 30 seconds (60 * 500ms)
                    sleep(Duration::from_millis(500)).await;
                    if fs::metadata(&file_path).await.is_ok() {
                        log::debug!(
                            "Download completed by another request: {}",
                            file_path.display()
                        );
                        return Ok(file_path);
                    }
                }
                return Err(format!("Timeout waiting for concurrent download: {}", url));
            }

            // Mark this URL as in-flight
            in_flight.insert(url.to_string());
        }

        log::info!("Cache MISS: Downloading {}", url);
        let result = self.do_download(url, auth_cookies, &file_path).await;

        // Remove from in-flight set
        {
            let mut in_flight = self.in_flight.lock().await;
            in_flight.remove(url);
        }

        result
    }

    async fn do_download(
        &self,
        url: &str,
        auth_cookies: Option<String>,
        file_path: &Path,
    ) -> Result<PathBuf, String> {
        let tmp_path = file_path.with_extension("tmp");

        if let Some(parent) = tmp_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to prepare cache directory: {}", e))?;
        }

        let bytes = self.download_with_retry(url, auth_cookies).await?;
        log::info!("Downloaded {} bytes from {}", bytes.len(), url);

        let mut file = fs::File::create(&tmp_path)
            .await
            .map_err(|e| format!("Failed to create cache file: {}", e))?;
        file.write_all(&bytes)
            .await
            .map_err(|e| format!("Failed to write cache file: {}", e))?;
        file.flush()
            .await
            .map_err(|e| format!("Failed to flush cache file: {}", e))?;

        fs::rename(&tmp_path, &file_path)
            .await
            .map_err(|e| format!("Failed to finalize cache file: {}", e))?;

        log::info!("Cached to: {}", file_path.display());

        Ok(file_path.to_path_buf())
    }

    fn hash_filename(url: &str) -> (String, Option<String>) {
        let mut hasher = Sha256::new();
        hasher.update(url.as_bytes());
        let hash = format!("{:x}", hasher.finalize());

        let extension = url::Url::parse(url).ok().and_then(|parsed| {
            Path::new(parsed.path())
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.split('?').next().unwrap_or(name))
                .and_then(|name| Path::new(name).extension())
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.to_lowercase())
        });

        (hash, extension)
    }

    async fn download_with_retry(
        &self,
        url: &str,
        auth_cookies: Option<String>,
    ) -> Result<Vec<u8>, String> {
        let mut attempt = 0;
        let mut backoff = INITIAL_BACKOFF;

        loop {
            let mut request = self.client.get(url).header(USER_AGENT, USER_AGENT_STRING);

            // Only pass cookies if URL is from VRChat domains to prevent leaking credentials
            let is_vrchat_domain = url.starts_with("https://api.vrchat.cloud/")
                || url.starts_with("https://files.vrchat.cloud/")
                || url.starts_with("https://assets.vrchat.com/")
                || url.starts_with("https://d348imysud55la.cloudfront.net/");

            if is_vrchat_domain {
                if let Some(ref cookies) = auth_cookies {
                    request = request.header(COOKIE, cookies);
                }
            }

            let response = request.send().await;
            match response {
                Ok(resp) => {
                    let status = resp.status();
                    log::debug!("[CACHE] HTTP {}: {}", status.as_u16(), url);

                    if status.is_success() {
                        return resp.bytes().await.map(|bytes| bytes.to_vec()).map_err(|e| {
                            log::error!("[CACHE] Failed to read bytes: {}", e);
                            format!("Failed to read image bytes: {}", e)
                        });
                    }

                    if status.as_u16() == 429 || status.is_server_error() {
                        log::warn!("[CACHE] Retryable error {} for: {}", status.as_u16(), url);
                        if attempt >= MAX_REQUEST_RETRIES {
                            return Err(format!(
                                "Image request failed after retries (status {}): {}",
                                status.as_u16(),
                                url
                            ));
                        }

                        let wait = Self::retry_after_seconds(&resp).unwrap_or(backoff);
                        sleep(wait).await;
                        attempt += 1;
                        backoff = (backoff * 2).min(MAX_BACKOFF);
                        continue;
                    }

                    log::error!("[CACHE] HTTP error {}: {}", status.as_u16(), url);
                    return Err(format!(
                        "Failed to download image (status {}): {}",
                        status.as_u16(),
                        url
                    ));
                }
                Err(err) => {
                    log::error!(
                        "[CACHE] Network error: {} (attempt {}/{})",
                        err,
                        attempt + 1,
                        MAX_REQUEST_RETRIES
                    );
                    if attempt >= MAX_REQUEST_RETRIES {
                        return Err(format!("Failed to download image: {}", err));
                    }
                    sleep(backoff).await;
                    attempt += 1;
                    backoff = (backoff * 2).min(MAX_BACKOFF);
                }
            }
        }
    }

    fn retry_after_seconds(response: &reqwest::Response) -> Option<Duration> {
        response
            .headers()
            .get("retry-after")
            .and_then(|value| value.to_str().ok())
            .and_then(|seconds| seconds.parse::<u64>().ok())
            .map(Duration::from_secs)
    }
}
