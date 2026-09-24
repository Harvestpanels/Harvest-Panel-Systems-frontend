import { useCallback, useState } from "react";
import { PageLoaderContext } from "./pageLoaderContext";
import LoadingOverlay from "../components/LoadingOverlay";

// Outside Suspense: keep the actual animation mounted across loading stages.
export default function PageLoaderProvider({ children }) {
  const [requests, setRequests] = useState(() => new Map());
  const register = useCallback((id, request) => {
    setRequests((current) => {
      const next = new Map(current);
      if (request) next.set(id, request);
      else next.delete(id);
      return next;
    });
  }, []);
  const pending = [...requests.values()].filter((request) => !request.done);
  function finish() {
    setRequests((current) => new Map([...current].map(([id, request]) =>
      [id, { ...request, done: true }],
    )));
    pending.forEach((request) => request.onDone());
  }
  return (
    <PageLoaderContext.Provider value={register}>
      {children}
      {pending.length > 0 && <LoadingOverlay ready={pending.every((request) => request.ready)} onDone={finish} />}
    </PageLoaderContext.Provider>
  );
}
