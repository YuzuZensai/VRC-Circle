use serde::{Deserialize, Serialize};
use specta::Type;
use std::fmt;

/// Result type alias for VRChat API operations
pub type VRCResult<T> = Result<T, VRCError>;

/// Main error type for VRChat API operations
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "data")]
pub enum VRCError {
    /// Network-related errors
    Network(String),

    /// HTTP errors with status code
    Http { status: u16, message: String },

    /// Authentication errors
    Authentication(String),

    /// Rate limiting error
    RateLimit(String),

    /// JSON parsing errors
    Parse(String),

    /// Invalid input or request
    InvalidInput(String),

    /// Unknown or unexpected errors
    Unknown(String),
}

impl VRCError {
    /// Create a new HTTP error
    pub fn http(status: u16, message: impl Into<String>) -> Self {
        Self::Http {
            status,
            message: message.into(),
        }
    }

    /// Create a new network error
    pub fn network(message: impl Into<String>) -> Self {
        Self::Network(message.into())
    }

    /// Create a new authentication error
    pub fn auth(message: impl Into<String>) -> Self {
        Self::Authentication(message.into())
    }

    /// Create a new rate limit error
    pub fn rate_limit(message: impl Into<String>) -> Self {
        Self::RateLimit(message.into())
    }

    /// Create a new parse error
    pub fn parse(message: impl Into<String>) -> Self {
        Self::Parse(message.into())
    }

    /// Create a new invalid input error
    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::InvalidInput(message.into())
    }

    /// Create an unknown error
    pub fn unknown(message: impl Into<String>) -> Self {
        Self::Unknown(message.into())
    }

    /// Get the error message
    pub fn message(&self) -> &str {
        match self {
            Self::Network(msg)
            | Self::Http { message: msg, .. }
            | Self::Authentication(msg)
            | Self::RateLimit(msg)
            | Self::Parse(msg)
            | Self::InvalidInput(msg)
            | Self::Unknown(msg) => msg,
        }
    }

    /// Get the HTTP status code if applicable
    pub fn status_code(&self) -> Option<u16> {
        match self {
            Self::Http { status, .. } => Some(*status),
            _ => None,
        }
    }
}

impl fmt::Display for VRCError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Network(msg) => write!(f, "Network error: {}", msg),
            Self::Http { status, message } => write!(f, "HTTP {} error: {}", status, message),
            Self::Authentication(msg) => write!(f, "Authentication error: {}", msg),
            Self::RateLimit(msg) => write!(f, "Rate limit: {}", msg),
            Self::Parse(msg) => write!(f, "Parse error: {}", msg),
            Self::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            Self::Unknown(msg) => write!(f, "Unknown error: {}", msg),
        }
    }
}

impl std::error::Error for VRCError {}

/// Convert reqwest errors to VRCError
impl From<reqwest::Error> for VRCError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            VRCError::network("Request timed out")
        } else if err.is_connect() {
            VRCError::network("Failed to connect to VRChat API")
        } else {
            VRCError::network(err.to_string())
        }
    }
}

/// Convert serde_json errors to VRCError
impl From<serde_json::Error> for VRCError {
    fn from(err: serde_json::Error) -> Self {
        VRCError::parse(format!("JSON parsing failed: {}", err))
    }
}
