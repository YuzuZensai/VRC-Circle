use sea_orm::sea_query::{Expr, OnConflict};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder, Schema, Statement, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct StoredAccount {
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    #[serde(default)]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub avatar_fallback_url: Option<String>,
    pub auth_cookie: Option<String>,
    pub two_factor_cookie: Option<String>,
    pub last_login: String,
}

mod account_entity {
    use sea_orm::entity::prelude::*;
    use sea_orm::ActiveModelBehavior;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
    #[sea_orm(table_name = "accounts")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub user_id: String,
        pub username: String,
        pub display_name: String,
        pub avatar_url: Option<String>,
        pub avatar_fallback_url: Option<String>,
        pub auth_cookie: Option<String>,
        pub two_factor_cookie: Option<String>,
        pub last_login: String,
        #[sea_orm(column_type = "Boolean", default_value = 0)]
        pub last_active: bool,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

use account_entity::{
    ActiveModel as AccountActiveModel, Column as AccountColumn, Entity as AccountEntity,
    Model as AccountModel,
};

pub struct AccountStore {
    db: DatabaseConnection,
}

impl AccountStore {
    pub async fn new() -> Result<Self, String> {
        let db = crate::store::connect_db("accounts").await?;

        let store = Self { db };
        store.init_schema().await?;

        Ok(store)
    }

    async fn init_schema(&self) -> Result<(), String> {
        let backend = self.db.get_database_backend();
        let schema = Schema::new(backend);

        let create_table = schema
            .create_table_from_entity(AccountEntity)
            .if_not_exists()
            .to_owned();

        let statement: Statement = backend.build(&create_table);
        self.db
            .execute(statement)
            .await
            .map_err(|e| format!("Failed to initialize accounts table: {}", e))?;

        Ok(())
    }

    pub async fn save_account(&self, account: StoredAccount) -> Result<(), String> {
        let mut txn = self
            .db
            .begin()
            .await
            .map_err(|e| format!("Failed to begin save transaction: {}", e))?;

        AccountEntity::update_many()
            .col_expr(AccountColumn::LastActive, Expr::value(false))
            .exec(&mut txn)
            .await
            .map_err(|e| format!("Failed to clear last active flag: {}", e))?;

        let mut active_model = to_active_model(account);
        active_model.last_active = Set(true);

        AccountEntity::insert(active_model)
            .on_conflict(
                OnConflict::column(AccountColumn::UserId)
                    .update_columns([
                        AccountColumn::Username,
                        AccountColumn::DisplayName,
                        AccountColumn::AvatarUrl,
                        AccountColumn::AvatarFallbackUrl,
                        AccountColumn::AuthCookie,
                        AccountColumn::TwoFactorCookie,
                        AccountColumn::LastLogin,
                        AccountColumn::LastActive,
                    ])
                    .to_owned(),
            )
            .exec(&mut txn)
            .await
            .map_err(|e| format!("Failed to upsert account: {}", e))?;

        txn.commit()
            .await
            .map_err(|e| format!("Failed to commit account save: {}", e))
    }

    pub async fn get_account(&self, user_id: &str) -> Result<Option<StoredAccount>, String> {
        let account = AccountEntity::find_by_id(user_id.to_string())
            .one(&self.db)
            .await
            .map_err(|e| format!("Failed to load account: {}", e))?;

        Ok(account.map(StoredAccount::from))
    }

    pub async fn get_last_active_account(&self) -> Result<Option<StoredAccount>, String> {
        let account = AccountEntity::find()
            .filter(AccountColumn::LastActive.eq(true))
            .one(&self.db)
            .await
            .map_err(|e| format!("Failed to load last active account: {}", e))?;

        Ok(account.map(StoredAccount::from))
    }

    pub async fn get_all_accounts(&self) -> Result<Vec<StoredAccount>, String> {
        let accounts = AccountEntity::find()
            .order_by_desc(AccountColumn::LastLogin)
            .all(&self.db)
            .await
            .map_err(|e| format!("Failed to load accounts: {}", e))?;

        Ok(accounts.into_iter().map(StoredAccount::from).collect())
    }

    pub async fn remove_account(&self, user_id: &str) -> Result<(), String> {
        let mut txn = self
            .db
            .begin()
            .await
            .map_err(|e| format!("Failed to begin remove transaction: {}", e))?;

        let target = AccountEntity::find_by_id(user_id.to_string())
            .one(&mut txn)
            .await
            .map_err(|e| format!("Failed to find account: {}", e))?;

        if target.is_none() {
            txn.rollback().await.ok();
            return Ok(());
        }

        let was_active = target.as_ref().map(|acc| acc.last_active).unwrap_or(false);

        AccountEntity::delete_by_id(user_id.to_string())
            .exec(&mut txn)
            .await
            .map_err(|e| format!("Failed to delete account: {}", e))?;

        if was_active {
            AccountEntity::update_many()
                .col_expr(AccountColumn::LastActive, Expr::value(false))
                .exec(&mut txn)
                .await
                .map_err(|e| format!("Failed to clear last active flag: {}", e))?;
        }

        txn.commit()
            .await
            .map_err(|e| format!("Failed to commit account removal: {}", e))
    }

    pub async fn set_active_account(&self, user_id: &str) -> Result<(), String> {
        let mut txn = self
            .db
            .begin()
            .await
            .map_err(|e| format!("Failed to begin activation transaction: {}", e))?;

        let account = AccountEntity::find_by_id(user_id.to_string())
            .one(&mut txn)
            .await
            .map_err(|e| format!("Failed to find account: {}", e))?;

        let Some(model) = account else {
            txn.rollback().await.ok();
            return Err("Account not found".to_string());
        };

        AccountEntity::update_many()
            .col_expr(AccountColumn::LastActive, Expr::value(false))
            .exec(&mut txn)
            .await
            .map_err(|e| format!("Failed to clear last active flags: {}", e))?;

        let mut active_model: AccountActiveModel = model.into();
        active_model.last_active = Set(true);
        active_model
            .update(&mut txn)
            .await
            .map_err(|e| format!("Failed to mark account active: {}", e))?;

        txn.commit()
            .await
            .map_err(|e| format!("Failed to commit account activation: {}", e))
    }

    pub async fn clear_all_accounts(&self) -> Result<(), String> {
        AccountEntity::delete_many()
            .exec(&self.db)
            .await
            .map_err(|e| format!("Failed to clear accounts: {}", e))?;
        Ok(())
    }

    pub async fn clear_last_active_account(&self) -> Result<(), String> {
        AccountEntity::update_many()
            .col_expr(AccountColumn::LastActive, Expr::value(false))
            .exec(&self.db)
            .await
            .map_err(|e| format!("Failed to clear last active account: {}", e))?;
        Ok(())
    }
}

fn to_active_model(account: StoredAccount) -> AccountActiveModel {
    AccountActiveModel {
        user_id: Set(account.user_id),
        username: Set(account.username),
        display_name: Set(account.display_name),
        avatar_url: Set(account.avatar_url),
        avatar_fallback_url: Set(account.avatar_fallback_url),
        auth_cookie: Set(account.auth_cookie),
        two_factor_cookie: Set(account.two_factor_cookie),
        last_login: Set(account.last_login),
        last_active: Set(false),
    }
}

impl From<AccountModel> for StoredAccount {
    fn from(model: AccountModel) -> Self {
        Self {
            user_id: model.user_id,
            username: model.username,
            display_name: model.display_name,
            avatar_url: model.avatar_url,
            avatar_fallback_url: model.avatar_fallback_url,
            auth_cookie: model.auth_cookie,
            two_factor_cookie: model.two_factor_cookie,
            last_login: model.last_login,
        }
    }
}
