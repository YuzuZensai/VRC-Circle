use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub module: String,
    pub message: String,
}

pub struct LogManager;

impl LogManager {
    pub fn get_log_file_path() -> Result<PathBuf, String> {
        let log_dir = dirs::data_local_dir()
            .ok_or("Failed to get local data directory")?
            .join("cafe.kirameki.vrc-circle")
            .join("logs");

        fs::create_dir_all(&log_dir)
            .map_err(|e| format!("Failed to create logs directory: {}", e))?;

        Ok(log_dir.join("vrc-circle.log"))
    }

    pub fn read_logs() -> Result<Vec<LogEntry>, String> {
        let log_path = Self::get_log_file_path()?;

        if !log_path.exists() {
            return Ok(Vec::new());
        }

        let content =
            fs::read_to_string(&log_path).map_err(|e| format!("Failed to read log file: {}", e))?;

        let mut entries = Vec::new();

        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }

            // Parse log line format: "2024-01-01 12:00:00 [INFO] module: message"
            if let Some(entry) = Self::parse_log_line(line) {
                entries.push(entry);
            }
        }

        Ok(entries)
    }

    fn parse_log_line(line: &str) -> Option<LogEntry> {
        // tauri-plugin-log format
        // Example: "2024-01-01 12:00:00.123 [INFO] vrc_circle: message"

        let parts: Vec<&str> = line.splitn(4, ' ').collect();
        if parts.len() < 4 {
            return None;
        }

        let timestamp = format!("{} {}", parts[0], parts[1]);
        let level_part = parts[2].trim_matches(|c| c == '[' || c == ']');
        let rest = parts[3];

        // Split module and message by ": "
        let (module, message) = if let Some(idx) = rest.find(": ") {
            let (mod_part, msg_part) = rest.split_at(idx);
            (mod_part.to_string(), msg_part[2..].to_string())
        } else {
            ("unknown".to_string(), rest.to_string())
        };

        Some(LogEntry {
            timestamp,
            level: level_part.to_uppercase(),
            source: "backend".to_string(),
            module,
            message,
        })
    }

    pub fn clear_logs() -> Result<(), String> {
        let log_path = Self::get_log_file_path()?;

        if log_path.exists() {
            fs::remove_file(&log_path).map_err(|e| format!("Failed to clear log file: {}", e))?;
        }

        Ok(())
    }

    pub fn export_logs() -> Result<String, String> {
        let entries = Self::read_logs()?;
        serde_json::to_string_pretty(&entries)
            .map_err(|e| format!("Failed to serialize logs: {}", e))
    }
}
