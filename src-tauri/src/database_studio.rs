// TODO: Improve this dev tool

use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseConnection, DbBackend, Statement,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TableInfo {
    pub name: String,
    pub sql: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ColumnInfo {
    pub cid: i32,
    pub name: String,
    pub r#type: String,
    pub notnull: i32,
    pub dflt_value: Option<String>,
    pub pk: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct QueryResult {
    pub columns: Vec<String>,
    #[specta(type = Vec<HashMap<String, String>>)]
    pub rows: Vec<HashMap<String, String>>,
    pub rows_affected: Option<i32>,
}

pub struct DatabaseStudio {
    db: DatabaseConnection,
}

impl DatabaseStudio {
    pub async fn new() -> Result<Self, String> {
        // Use per-user local data directory (e.g. %LOCALAPPDATA% on Windows)
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

        let db = Database::connect(options)
            .await
            .map_err(|e| format!("Failed to connect to database: {}", e))?;

        Ok(Self { db })
    }

    pub async fn list_tables(&self) -> Result<Vec<TableInfo>, String> {
        let query = Statement::from_string(
            DbBackend::Sqlite,
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
                .to_string(),
        );

        let result = self
            .db
            .query_all(query)
            .await
            .map_err(|e| format!("Failed to list tables: {}", e))?;

        let tables: Vec<TableInfo> = result
            .into_iter()
            .map(|row| {
                let name: String = row.try_get("", "name").unwrap_or_default();
                let sql: String = row.try_get("", "sql").unwrap_or_default();
                TableInfo { name, sql }
            })
            .collect();

        Ok(tables)
    }

    pub async fn get_table_schema(&self, table_name: &str) -> Result<Vec<ColumnInfo>, String> {
        let query = Statement::from_string(
            DbBackend::Sqlite,
            format!("PRAGMA table_info('{}')", table_name),
        );

        let result = self
            .db
            .query_all(query)
            .await
            .map_err(|e| format!("Failed to get table schema: {}", e))?;

        let columns: Vec<ColumnInfo> = result
            .into_iter()
            .map(|row| ColumnInfo {
                cid: row.try_get("", "cid").unwrap_or_default(),
                name: row.try_get("", "name").unwrap_or_default(),
                r#type: row.try_get("", "type").unwrap_or_default(),
                notnull: row.try_get("", "notnull").unwrap_or_default(),
                dflt_value: row.try_get("", "dflt_value").ok(),
                pk: row.try_get("", "pk").unwrap_or_default(),
            })
            .collect();

        Ok(columns)
    }

    pub async fn get_table_data(
        &self,
        table_name: &str,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<QueryResult, String> {
        let limit_val = limit.unwrap_or(100);
        let offset_val = offset.unwrap_or(0);

        let query_str = format!(
            "SELECT * FROM {} LIMIT {} OFFSET {}",
            table_name, limit_val, offset_val
        );

        let mut result = self.execute_query(&query_str).await?;

        // Get actual column names from schema and remap the data
        let schema = self.get_table_schema(table_name).await?;
        let actual_columns: Vec<String> = schema.into_iter().map(|col| col.name).collect();

        // Remap rows from column_0, column_1 to actual column names
        let remapped_rows: Vec<HashMap<String, String>> = result
            .rows
            .into_iter()
            .map(|row| {
                let mut new_row = HashMap::new();
                for (idx, actual_col) in actual_columns.iter().enumerate() {
                    let key = format!("column_{}", idx);
                    if let Some(value) = row.get(&key) {
                        new_row.insert(actual_col.clone(), value.clone());
                    }
                }
                new_row
            })
            .collect();

        result.columns = actual_columns;
        result.rows = remapped_rows;

        Ok(result)
    }

    pub async fn get_table_count(&self, table_name: &str) -> Result<i32, String> {
        let query = Statement::from_string(
            DbBackend::Sqlite,
            format!("SELECT COUNT(*) as count FROM {}", table_name),
        );

        let result = self
            .db
            .query_one(query)
            .await
            .map_err(|e| format!("Failed to count rows: {}", e))?;

        if let Some(row) = result {
            let count: i64 = row.try_get("", "count").unwrap_or_default();
            Ok(count as i32)
        } else {
            Ok(0)
        }
    }

    pub async fn execute_query(&self, query: &str) -> Result<QueryResult, String> {
        use sea_orm::TryGetable;

        let query_stmt = Statement::from_string(DbBackend::Sqlite, query.to_string());

        let result = self
            .db
            .query_all(query_stmt)
            .await
            .map_err(|e| format!("Query execution failed: {}", e))?;

        if result.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                rows_affected: Some(0),
            });
        }

        // Extract column names and convert rows
        let mut columns: Vec<String> = Vec::new();
        let mut rows: Vec<HashMap<String, String>> = Vec::new();

        for row in result {
            // Get columns from first row by trying all possible indices
            if columns.is_empty() {
                let mut idx = 0;
                loop {
                    // Try to get as String first, then fall back to other types
                    match String::try_get_by_index(&row, idx) {
                        Ok(_) => {
                            idx += 1;
                        }
                        Err(_) => {
                            // Try as i64
                            match i64::try_get_by_index(&row, idx) {
                                Ok(_) => {
                                    idx += 1;
                                }
                                Err(_) => break,
                            }
                        }
                    }
                }
                // We don't know column names yet, will be set by get_table_data
                columns = (0..idx).map(|i| format!("column_{}", i)).collect();
            }

            // Convert row to HashMap with String values by index
            let mut map = HashMap::new();
            for idx in 0..columns.len() {
                // Try multiple types and convert to string
                let str_value = if let Ok(val) = String::try_get_by_index(&row, idx) {
                    val
                } else if let Ok(val) = i64::try_get_by_index(&row, idx) {
                    val.to_string()
                } else if let Ok(val) = f64::try_get_by_index(&row, idx) {
                    val.to_string()
                } else if let Ok(val) = bool::try_get_by_index(&row, idx) {
                    val.to_string()
                } else if let Ok(Some(val)) = Option::<String>::try_get_by_index(&row, idx) {
                    val
                } else {
                    "NULL".to_string()
                };

                let key = format!("column_{}", idx);
                map.insert(key, str_value);
            }
            rows.push(map);
        }

        Ok(QueryResult {
            columns,
            rows,
            rows_affected: None,
        })
    }
}
