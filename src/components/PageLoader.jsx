import { useContext, useLayoutEffect, useRef, useState } from "react";
import { PageLoaderContext } from "../context/pageLoaderContext";
import LoadingOverlay from "./LoadingOverlay";

export default function PageLoader({ ready, onDone }) {
  const register = useContext(PageLoaderContext);
  const [id] = useState(() => Symbol("page-loader"));
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => { onDoneRef.current = onDone; });
  useLayoutEffect(() => {
    if (!register) return;
    register(id, { ready, onDone: () => onDoneRef.current?.() });
    return () => register(id, null);
  }, [register, id, ready]);
  return register ? null : <LoadingOverlay ready={ready} onDone={onDone} />;
}
