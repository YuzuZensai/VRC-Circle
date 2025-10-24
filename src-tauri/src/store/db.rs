use sea_orm::{ConnectOptions, Database, DatabaseConnection};

pub async fn connect_db(component: &str) -> Result<DatabaseConnection, String> {
    // Use per-user local data directory (this is %LOCALAPPDATA% on Windows)
    let base_dir = dirs::data_local_dir()
        .ok_or("Failed to resolve local data directory")?
        .join("vrc-circle");

    std::fs::create_dir_all(&base_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    let db_path = base_dir.join("data.sqlite");
    let db_url = format!(
        "sqlite://{}?mode=rwc",
        db_path.to_string_lossy().replace('\\', "/")
    );

    let mut options = ConnectOptions::new(db_url);
    options.sqlx_logging(false);

    Database::connect(options)
        .await
        .map_err(|e| format!("Failed to connect to {} database: {}", component, e))
}
