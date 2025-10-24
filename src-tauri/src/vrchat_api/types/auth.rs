use serde::{Deserialize, Serialize};
use specta::Type;
use super::enums::UserStatus;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct LoginCredentials {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum LoginResult {
    Success { user: super::user::User },
    TwoFactorRequired { methods: Vec<String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TwoFactorAuthResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_two_factor_auth: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoFactorCode {
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoFactorVerifyResponse {
    pub verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatusRequest {
    pub status: UserStatus,
    pub status_description: String,
}
