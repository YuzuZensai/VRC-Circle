pub const USER_AGENT_STRING: &str = "VRC-Circle/0.0.1 contact@kirameki.cafe";

// Retry configuration
pub const MAX_REQUEST_RETRIES: u8 = 5;

// Backoff timings (milliseconds)
pub const INITIAL_BACKOFF: u64 = 500;
pub const MAX_BACKOFF: u64 = 10_000;

// Rate limiting
pub const MAX_DOWNLOADS_PER_SECOND: u32 = 10;

// Common API Request headers builder
use reqwest::header::{
    ACCEPT, AUTHORIZATION, CONTENT_TYPE, HeaderMap, HeaderValue, ORIGIN, USER_AGENT,
};

pub fn build_api_headers(auth: Option<&str>, cookie: Option<&str>) -> HeaderMap {
    let mut headers = HeaderMap::new();

    headers.insert(USER_AGENT, HeaderValue::from_static(USER_AGENT_STRING));
    headers.insert(ACCEPT, HeaderValue::from_static("*/*"));
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(ORIGIN, HeaderValue::from_static("https://vrchat.com"));

    if let Some(auth_value) = auth {
        headers.insert(AUTHORIZATION, HeaderValue::from_str(auth_value).unwrap());
    }

    if let Some(cookie_value) = cookie {
        headers.insert("cookie", HeaderValue::from_str(cookie_value).unwrap());
    }

    headers
}
