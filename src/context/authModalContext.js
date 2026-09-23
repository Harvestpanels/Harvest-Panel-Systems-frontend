import { createContext } from "react";

// Only ever holds { open, openAuthModal, closeAuthModal }. Deliberately free
// of any Supabase import so it can sit around the whole app — including the
// marketing pages — without dragging the auth SDK into the main bundle.
export const AuthModalContext = createContext(null);
