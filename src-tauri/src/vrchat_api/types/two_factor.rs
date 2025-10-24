#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TwoFactorMethod {
    EmailOtp,
    Totp,
}

impl TwoFactorMethod {
    pub fn endpoint(&self) -> &'static str {
        match self {
            Self::EmailOtp => "emailotp",
            Self::Totp => "totp",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "emailotp" => Some(Self::EmailOtp),
            "totp" | "otp" => Some(Self::Totp),
            _ => None,
        }
    }
}
