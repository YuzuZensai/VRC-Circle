use serde::{Deserialize, Serialize};
use specta::Type;

/// User's current status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    /// User is online and active
    Active,
    /// User is online and auto accepting invitations to join
    #[serde(rename = "join me")]
    JoinMe,
    /// User is online but is hiding their location and requires invitation to join
    #[serde(rename = "ask me")]
    AskMe,
    /// User is busy
    Busy,
    /// User is offline
    Offline,
}

impl Default for UserStatus {
    fn default() -> Self {
        UserStatus::Offline
    }
}

impl std::fmt::Display for UserStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserStatus::Active => write!(f, "active"),
            UserStatus::JoinMe => write!(f, "join me"),
            UserStatus::AskMe => write!(f, "ask me"),
            UserStatus::Busy => write!(f, "busy"),
            UserStatus::Offline => write!(f, "offline"),
        }
    }
}

/// Release status of avatars and worlds
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum ReleaseStatus {
    /// Publicly released
    Public,
    /// Private/restricted access
    Private,
    /// Hidden from listings
    Hidden,
    // TODO: Should this be here? It's not really a status, more of a filter.
    /// Filter for all statuses
    All,
}

impl Default for ReleaseStatus {
    fn default() -> Self {
        ReleaseStatus::Public
    }
}

impl std::fmt::Display for ReleaseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ReleaseStatus::Public => write!(f, "public"),
            ReleaseStatus::Private => write!(f, "private"),
            ReleaseStatus::Hidden => write!(f, "hidden"),
            ReleaseStatus::All => write!(f, "all"),
        }
    }
}

/// User's developer type/staff level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum DeveloperType {
    /// Normal user
    None,
    /// Trusted user
    Trusted,
    /// VRChat Developer/Staff
    Internal,
    /// VRChat Moderator
    Moderator,
}

impl Default for DeveloperType {
    fn default() -> Self {
        DeveloperType::None
    }
}

impl std::fmt::Display for DeveloperType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeveloperType::None => write!(f, "none"),
            DeveloperType::Trusted => write!(f, "trusted"),
            DeveloperType::Internal => write!(f, "internal"),
            DeveloperType::Moderator => write!(f, "moderator"),
        }
    }
}

/// Age verification status
/// `verified` is obsolete. according to the unofficial docs, Users who have verified and are 18+ can switch to `plus18` status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum AgeVerificationStatus {
    /// Age verification status is hidden
    Hidden,
    /// Legacy verified status (obsolete)
    Verified,
    /// User is verified to be 18+
    #[serde(rename = "18+")]
    Plus18,
}

impl Default for AgeVerificationStatus {
    fn default() -> Self {
        AgeVerificationStatus::Hidden
    }
}

impl std::fmt::Display for AgeVerificationStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgeVerificationStatus::Hidden => write!(f, "hidden"),
            AgeVerificationStatus::Verified => write!(f, "verified"),
            AgeVerificationStatus::Plus18 => write!(f, "18+"),
        }
    }
}

/// Friend request status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum FriendRequestStatus {
    /// No friend request
    #[serde(rename = "")]
    None,
    /// Outgoing friend request pending
    #[serde(rename = "outgoing")]
    Outgoing,
    /// Incoming friend request pending
    #[serde(rename = "incoming")]
    Incoming,
    /// Completed friend request
    #[serde(rename = "completed")]
    Completed,
}

impl Default for FriendRequestStatus {
    fn default() -> Self {
        FriendRequestStatus::None
    }
}

impl std::fmt::Display for FriendRequestStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FriendRequestStatus::None => write!(f, ""),
            FriendRequestStatus::Outgoing => write!(f, "outgoing"),
            FriendRequestStatus::Incoming => write!(f, "incoming"),
            FriendRequestStatus::Completed => write!(f, "completed"),
        }
    }
}

/// State of the user
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum UserState {
    /// User is offline
    Offline,
    /// User is active
    Active,
    /// User is online
    Online,
}

impl Default for UserState {
    fn default() -> Self {
        UserState::Offline
    }
}

impl std::fmt::Display for UserState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserState::Offline => write!(f, "offline"),
            UserState::Active => write!(f, "active"),
            UserState::Online => write!(f, "online"),
        }
    }
}

/// Avatar performance ratings
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum PerformanceRatings {
    /// No rating
    None,
    /// Excellent performance
    Excellent,
    /// Good performance
    Good,
    /// Medium performance
    Medium,
    /// Poor performance
    Poor,
    /// Very poor performance
    VeryPoor,
}

impl Default for PerformanceRatings {
    fn default() -> Self {
        PerformanceRatings::None
    }
}

impl std::fmt::Display for PerformanceRatings {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PerformanceRatings::None => write!(f, "None"),
            PerformanceRatings::Excellent => write!(f, "Excellent"),
            PerformanceRatings::Good => write!(f, "Good"),
            PerformanceRatings::Medium => write!(f, "Medium"),
            PerformanceRatings::Poor => write!(f, "Poor"),
            PerformanceRatings::VeryPoor => write!(f, "VeryPoor"),
        }
    }
}

/// Sort order for API queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum OrderOption {
    /// Ascending order
    Ascending,
    /// Descending order
    Descending,
}

impl Default for OrderOption {
    fn default() -> Self {
        OrderOption::Descending
    }
}

impl std::fmt::Display for OrderOption {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OrderOption::Ascending => write!(f, "ascending"),
            OrderOption::Descending => write!(f, "descending"),
        }
    }
}
