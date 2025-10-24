use serde::{Deserialize, Serialize};
use specta::Type;

const VRCHAT_STATUS_URL: &str = "https://status.vrchat.com/api/v2/status.json";

/// Response from VRChat status API
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct VRChatStatusResponse {
    pub page: StatusPage,
    pub status: SystemStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct StatusPage {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(rename = "time_zone")]
    pub time_zone: String,
    #[serde(rename = "updated_at")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SystemStatus {
    /// Indicator of system status
    pub indicator: StatusIndicator,
    /// Human-readable status description
    pub description: String,
}

impl SystemStatus {
    /// Check if the system is operating normally
    pub fn is_healthy(&self) -> bool {
        matches!(self.indicator, StatusIndicator::None)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum StatusIndicator {
    None,
    Minor,
    Major,
    Critical,
}

/// Fetch current VRChat service status
pub async fn fetch_vrchat_status() -> Result<VRChatStatusResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(VRCHAT_STATUS_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch status: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    log::debug!("VRChat status API response: {}", response_text);

    let status = serde_json::from_str::<VRChatStatusResponse>(&response_text).map_err(|e| {
        format!(
            "Failed to parse status response: {}. Response was: {}",
            e, response_text
        )
    })?;

    Ok(status)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_severity_levels() {
        let healthy = SystemStatus {
            indicator: StatusIndicator::None,
            description: "All Systems Operational".to_string(),
        };
        assert!(healthy.is_healthy());

        let major = SystemStatus {
            indicator: StatusIndicator::Major,
            description: "Partial System Outage".to_string(),
        };
        assert!(!major.is_healthy());
    }
}
