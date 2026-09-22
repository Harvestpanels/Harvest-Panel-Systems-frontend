import { createContext } from "react";

// Context lives in its own module so AuthProvider.jsx exports a component and
// nothing else — the project's eslint react-refresh rule rejects a file that
// exports both a component and other values.
export const AuthContext = createContext(null);
