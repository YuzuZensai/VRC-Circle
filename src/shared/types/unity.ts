export interface UnityStatus {
  hubInstalled: boolean;
  editorRoot: string | null;
  installedVersions: string[];
  requiredVersion: string | null;
  installUrl: string | null;
  match: "ok" | "missing" | "no-editor" | "unknown";
}
