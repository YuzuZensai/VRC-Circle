use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    Schema, Statement,
};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AppSettings {
    pub developer_mode: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            developer_mode: false,
        }
    }
}

mod settings_entity {
    use sea_orm::ActiveModelBehavior;
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
    #[sea_orm(table_name = "settings")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub key: String,
        pub value: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

use settings_entity::{
    ActiveModel as SettingsActiveModel, Column as SettingsColumn, Entity as SettingsEntity,
};

pub struct SettingsStore {
    db: DatabaseConnection,
}

impl SettingsStore {
    pub async fn new() -> Result<Self, String> {
        let db = crate::store::connect_db("settings").await?;
        let store = Self { db };
        store.init_schema().await?;

        Ok(store)
    }

    async fn init_schema(&self) -> Result<(), String> {
        let backend = self.db.get_database_backend();
        let schema = Schema::new(backend);

        let create_table = schema
            .create_table_from_entity(SettingsEntity)
            .if_not_exists()
            .to_owned();

        let statement: Statement = backend.build(&create_table);
        self.db
            .execute(statement)
            .await
            .map_err(|e| format!("Failed to initialize settings table: {}", e))?;

        Ok(())
    }

    async fn get_setting(&self, key: &str, default: &str) -> Result<String, String> {
        let settings_row = SettingsEntity::find()
            .filter(SettingsColumn::Key.eq(key))
            .one(&self.db)
            .await
            .map_err(|e| format!("Failed to load setting '{}': {}", key, e))?;

        Ok(settings_row
            .map(|row| row.value)
            .unwrap_or_else(|| default.to_string()))
    }

    async fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let active_model = SettingsActiveModel {
            key: Set(key.to_string()),
            value: Set(value.to_string()),
        };

        SettingsEntity::insert(active_model)
            .on_conflict(
                OnConflict::column(SettingsColumn::Key)
                    .update_column(SettingsColumn::Value)
                    .to_owned(),
            )
            .exec(&self.db)
            .await
            .map_err(|e| format!("Failed to save setting '{}': {}", key, e))?;

        Ok(())
    }

    pub async fn get_settings(&self) -> Result<AppSettings, String> {
        let developer_mode = self.get_setting("developer_mode", "false").await?;

        Ok(AppSettings {
            developer_mode: developer_mode == "true",
        })
    }

    pub async fn save_settings(&self, settings: AppSettings) -> Result<(), String> {
        self.set_setting(
            "developer_mode",
            if settings.developer_mode {
                "true"
            } else {
                "false"
            },
        )
        .await
    }

    pub async fn get_developer_mode(&self) -> Result<bool, String> {
        let value = self.get_setting("developer_mode", "false").await?;
        Ok(value == "true")
    }

    pub async fn set_developer_mode(&self, enabled: bool) -> Result<(), String> {
        self.set_setting("developer_mode", if enabled { "true" } else { "false" })
            .await
    }
}
