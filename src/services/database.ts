import { invoke } from '@tauri-apps/api/core';
import { parseVRCError } from '../types/errors';
import type { TableInfo, ColumnInfo, QueryResult } from '../types/bindings';

export class DatabaseService {
  static async listTables(): Promise<TableInfo[]> {
    try {
      return await invoke<TableInfo[]>('db_list_tables');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
    try {
      return await invoke<ColumnInfo[]>('db_get_table_schema', { tableName });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getTableData(
    tableName: string,
    limit?: number,
    offset?: number
  ): Promise<QueryResult> {
    try {
      return await invoke<QueryResult>('db_get_table_data', {
        tableName,
        limit,
        offset,
      });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getTableCount(tableName: string): Promise<number> {
    try {
      return await invoke<number>('db_get_table_count', { tableName });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async executeQuery(query: string): Promise<QueryResult> {
    try {
      return await invoke<QueryResult>('db_execute_query', { query });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

}
