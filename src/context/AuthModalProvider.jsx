import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { AuthModalContext } from "./authModalContext";

// The modal — and the Supabase client it pulls in — is a separate chunk that
// only downloads when someone actually clicks "Log in". Importing it eagerly
// would put the whole auth SDK in the main bundle, which every visitor
// reading the marketing pages would pay for.
const AuthModal = lazy(() => import("../components/AuthModal"));

export default function AuthModalProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openAuthModal = useCallback(() => setOpen(true), []);
  const closeAuthModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openAuthModal, closeAuthModal }),
    [open, openAuthModal, closeAuthModal]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {/* No fallback: the chunk is small and a flash of a spinner over the
          page reads worse than the dialog simply appearing a moment later. */}
      {open && (
        <Suspense fallback={null}>
          <AuthModal onClose={closeAuthModal} />
        </Suspense>
      )}
    </AuthModalContext.Provider>
  );
}
