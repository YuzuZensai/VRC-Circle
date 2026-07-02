import { useEffect, useState, type DependencyList } from "react";
import { errorMessage } from "./api";

export type Async<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

function sameDeps(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}

export function useAsync<T>(
  load: () => Promise<T>,
  deps: DependencyList,
  fallback = "Something went wrong.",
): Async<T> {
  const [state, setState] = useState<Async<T>>({ status: "loading" });
  const [prevDeps, setPrevDeps] = useState(deps);

  if (!sameDeps(prevDeps, deps)) {
    setPrevDeps(deps);
    setState({ status: "loading" });
  }

  useEffect(() => {
    let active = true;
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
