import { useState, useEffect } from "react";
import { DatabaseService } from "@/services/database";
import type { TableInfo, ColumnInfo, QueryResult } from "@/types/bindings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Play,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Key,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function DatabaseStudio() {
  const { t } = useTranslation();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<ColumnInfo[]>([]);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [rowCount, setRowCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editedRows, setEditedRows] = useState<
    Map<number, Record<string, string>>
  >(new Map());
  const [schemaExpanded, setSchemaExpanded] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable, page]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const tableList = await DatabaseService.listTables();
      setTables(tableList);
    } catch (error) {
      console.error("Failed to load tables", error);
      toast.error(
        t("component.developerTools.databaseStudio.toasts.loadTablesFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const [schemaData, data, count] = await Promise.all([
        DatabaseService.getTableSchema(tableName),
        DatabaseService.getTableData(tableName, pageSize, page * pageSize),
        DatabaseService.getTableCount(tableName),
      ]);

      setSchema(schemaData);
      setTableData(data);
      setRowCount(count);
    } catch (error) {
      console.error("Failed to load table data", error);
      toast.error(
        t("component.developerTools.databaseStudio.toasts.loadTableDataFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const executeCustomQuery = async () => {
    if (!customQuery.trim()) {
      toast.error(
        t("component.developerTools.databaseStudio.toasts.enterQuery")
      );
      return;
    }

    setLoading(true);
    try {
      const result = await DatabaseService.executeQuery(customQuery);
      setQueryResult(result);
      toast.success(
        t("component.developerTools.databaseStudio.toasts.queryExecuted")
      );
    } catch (error) {
      console.error("Query execution failed", error);
      toast.error(
        t("component.developerTools.databaseStudio.toasts.queryFailed", {
          message: String(error),
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (
    rowIdx: number,
    col: string,
    currentValue: string
  ) => {
    setEditingCell({ rowIdx, col });
    setEditValue(currentValue === "NULL" ? "" : currentValue);
  };

  const handleSaveCell = (rowIdx: number, col: string) => {
    if (!tableData || !selectedTable) return;

    const row = tableData.rows[rowIdx];
    const newEditedRows = new Map(editedRows);
    const editedRow = newEditedRows.get(rowIdx) || { ...row };
    editedRow[col] = editValue;
    newEditedRows.set(rowIdx, editedRow as Record<string, string>);
    setEditedRows(newEditedRows);

    // Update local data
    const newRows = [...tableData.rows];
    newRows[rowIdx] = { ...row, [col]: editValue };
    setTableData({ ...tableData, rows: newRows });

    setEditingCell(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleSaveRow = async (rowIdx: number) => {
    if (!selectedTable || !tableData) return;

    const editedRow = editedRows.get(rowIdx);
    if (!editedRow) return;

    const primaryKey = schema.find((col) => col.pk === 1);
    if (!primaryKey) {
      toast.error(
        t("component.developerTools.databaseStudio.toasts.cannotUpdateNoPK")
      );
      return;
    }

    const pkValue = editedRow[primaryKey.name];
    const setClauses = Object.entries(editedRow)
      .filter(([key]) => key !== primaryKey.name)
      .map(([key, value]) => `${key} = '${value.replace(/'/g, "''")}'`)
      .join(", ");

    const updateQuery = `UPDATE ${selectedTable} SET ${setClauses} WHERE ${
      primaryKey.name
    } = '${pkValue.replace(/'/g, "''")}'`;

    try {
      await DatabaseService.executeQuery(updateQuery);
      toast.success(
        t("component.developerTools.databaseStudio.toasts.rowUpdated")
      );
      const newEditedRows = new Map(editedRows);
      newEditedRows.delete(rowIdx);
      setEditedRows(newEditedRows);
      await loadTableData(selectedTable);
    } catch (error) {
      console.error("Failed to update row", error);
      toast.error(
        t("component.developerTools.databaseStudio.toasts.updateFailed", {
          message: String(error),
        })
      );
    }
  };

  const handleDeleteRow = async (rowIdx: number) => {
    if (!selectedTable || !tableData) return;

    const row = tableData.rows[rowIdx];
    const primaryKey = schema.find((col) => col.pk === 1);

    if (!primaryKey) {
      toast.error(
        t("component.developerTools.databaseStudio.toasts.cannotDeleteNoPK")
      );
      return;
    }

    const pkValue = row[primaryKey.name];
    const confirmed = window.confirm(
      t("component.developerTools.databaseStudio.confirm.deleteRow", {
        column: primaryKey.name,
        value: String(pkValue),
      })
    );

    if (!confirmed || !pkValue) return;

    const deleteQuery = `DELETE FROM ${selectedTable} WHERE ${
      primaryKey.name
    } = '${pkValue.replace(/'/g, "''")}'`;

    try {
      await DatabaseService.executeQuery(deleteQuery);
      toast.success(
        t("component.developerTools.databaseStudio.toasts.rowDeleted")
      );
      await loadTableData(selectedTable);
    } catch (error) {
      console.error("Failed to delete row", error);
      toast.error(
        t("component.developerTools.databaseStudio.toasts.deleteFailed", {
          message: String(error),
        })
      );
    }
  };

  const renderTable = (result: QueryResult, editable = false) => {
    if (!result || result.columns.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t("component.developerTools.databaseStudio.browse.data.noData")}
        </div>
      );
    }

    const hasEdits = (rowIdx: number) => editedRows.has(rowIdx);

    return (
      <div className="border rounded-md overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {editable && (
                <TableHead className="w-24 whitespace-nowrap">
                  {t(
                    "component.developerTools.databaseStudio.browse.table.actions"
                  )}
                </TableHead>
              )}
              {result.columns.map((col) => (
                <TableHead
                  key={col}
                  className="font-mono text-xs font-semibold whitespace-nowrap"
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={result.columns.length + (editable ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t(
                    "component.developerTools.databaseStudio.browse.table.noRows"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={
                    hasEdits(idx) ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
                  }
                >
                  {editable && (
                    <TableCell className="space-x-1">
                      {hasEdits(idx) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleSaveRow(idx)}
                          title={t(
                            "component.developerTools.databaseStudio.browse.table.saveTitle"
                          )}
                        >
                          <Save className="h-3 w-3 text-green-600" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDeleteRow(idx)}
                        title={t(
                          "component.developerTools.databaseStudio.browse.table.deleteTitle"
                        )}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </TableCell>
                  )}
                  {result.columns.map((col) => {
                    const value = row[col];
                    const displayValue =
                      value === null || value === undefined
                        ? "NULL"
                        : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value);

                    const isEditing =
                      editingCell?.rowIdx === idx && editingCell?.col === col;

                    return (
                      <TableCell key={col} className="font-mono text-xs p-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1 p-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 text-xs font-mono"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveCell(idx, col);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleSaveCell(idx, col)}
                            >
                              <Save className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`p-2 truncate max-w-md ${
                              editable ? "cursor-pointer hover:bg-muted/50" : ""
                            }`}
                            title={displayValue}
                            onClick={() =>
                              editable && handleCellEdit(idx, col, displayValue)
                            }
                          >
                            {displayValue}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  const totalPages = Math.ceil(rowCount / pageSize);

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Table List */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {t("component.developerTools.databaseStudio.sidebar.title")}
            </h2>
          </div>
          <Button
            onClick={loadTables}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            {t("component.developerTools.databaseStudio.sidebar.refresh")}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {tables.map((table) => (
              <Button
                key={table.name}
                variant={selectedTable === table.name ? "secondary" : "ghost"}
                className="w-full justify-start mb-1 font-mono text-xs"
                onClick={() => {
                  setSelectedTable(table.name);
                  setPage(0);
                }}
              >
                <ChevronRight className="h-4 w-4 mr-2" />
                {table.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="browse" className="flex-1 flex flex-col">
          <div className="border-b px-4 py-3">
            <TabsList className="bg-transparent p-0 h-auto gap-3 rounded-none shadow-none">
              <TabsTrigger value="browse">
                {t("component.developerTools.databaseStudio.tabs.browse")}
              </TabsTrigger>
              <TabsTrigger value="query">
                {t("component.developerTools.databaseStudio.tabs.query")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="browse"
            className="flex-1 overflow-hidden m-0 p-6"
          >
            {!selectedTable ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t(
                      "component.developerTools.databaseStudio.browse.noTableSelected.title"
                    )}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      "component.developerTools.databaseStudio.browse.noTableSelected.description"
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="flex flex-col h-full gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-mono flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {selectedTable}
                      <Badge variant="secondary" className="ml-2">
                        {rowCount} rows
                      </Badge>
                    </CardTitle>
                    <CardDescription>Table schema and data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                          {t(
                            "component.developerTools.databaseStudio.browse.schema.title"
                          )}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setSchemaExpanded((prev) => !prev)}
                        >
                          {schemaExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {schemaExpanded
                            ? t(
                                "component.developerTools.databaseStudio.browse.schema.hide"
                              )
                            : t(
                                "component.developerTools.databaseStudio.browse.schema.show"
                              )}
                        </Button>
                      </div>
                      {!schemaExpanded && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {t(
                            "component.developerTools.databaseStudio.browse.schema.hidden",
                            { count: schema.length }
                          )}
                        </p>
                      )}
                      {schemaExpanded && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {schema.map((col) => (
                            <Badge
                              key={col.name}
                              variant="outline"
                              className="font-mono"
                            >
                              {col.pk === 1 && <Key className="h-3 w-3 mr-1" />}
                              {col.name}: {col.type}
                              {col.notnull === 1 && " NOT NULL"}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1 overflow-hidden flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {t(
                          "component.developerTools.databaseStudio.browse.data.title"
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0 || loading}
                          size="sm"
                          variant="outline"
                        >
                          {t(
                            "component.developerTools.databaseStudio.browse.data.previous"
                          )}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {t(
                            "component.developerTools.databaseStudio.browse.data.pageInfo",
                            { page: page + 1, total: totalPages }
                          )}
                        </span>
                        <Button
                          onClick={() =>
                            setPage(Math.min(totalPages - 1, page + 1))
                          }
                          disabled={page >= totalPages - 1 || loading}
                          size="sm"
                          variant="outline"
                        >
                          {t(
                            "component.developerTools.databaseStudio.browse.data.next"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-4">
                    {loading ? (
                      <div className="text-center py-8">
                        {t(
                          "component.developerTools.databaseStudio.browse.data.loading"
                        )}
                      </div>
                    ) : tableData ? (
                      renderTable(tableData, true)
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="query" className="flex-1 overflow-hidden m-0 p-6">
            <div className="flex flex-col h-full gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom SQL Query</CardTitle>
                  <CardDescription>
                    Execute custom SQL queries against the database (read-only
                    recommended)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="SELECT * FROM accounts LIMIT 10"
                    className="font-mono text-sm min-h-[150px]"
                  />
                  <Button onClick={executeCustomQuery} disabled={loading}>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Query
                  </Button>
                </CardContent>
              </Card>

              {queryResult && (
                <Card className="flex-1 overflow-hidden flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">Query Results</CardTitle>
                    {queryResult.rows_affected !== null && (
                      <CardDescription>
                        Rows affected: {queryResult.rows_affected}
                      </CardDescription>
                    )}
                    {queryResult.rows.length > 0 && (
                      <CardDescription>
                        {queryResult.rows.length} rows returned
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-4">
                    {renderTable(queryResult)}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
