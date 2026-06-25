import { useEffect, useState, type DependencyList } from "react";
import { errorMessage } from "./api";

export type Async<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

export function useAsync<T>(
  load: () => Promise<T>,
  deps: DependencyList,
  fallback = "Something went wrong.",
): Async<T> {
  const [state, setState] = useState<Async<T>>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    load()
      .then((data) => active && setState({ status: "ready", data }))
      .catch(
        (err) => active && setState({ status: "error", message: errorMessage(err, fallback) }),
      );
    return () => {
      active = false;
    };
    // load is intentionally not a dep; callers pass the real deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
