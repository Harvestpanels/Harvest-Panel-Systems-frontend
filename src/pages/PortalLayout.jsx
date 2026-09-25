import { Outlet } from "react-router-dom";
import AuthProvider from "../context/AuthProvider";
import ToastProvider from "../components/toast/ToastProvider";
import "../styles/App.css";
import "./Portal.css";

// Wraps every /portal route in the auth session provider.
//
// This exists as its own lazily-loaded route element rather than wrapping the
// whole app in App.jsx: AuthProvider imports the Supabase client, and an eager
// import pulled the entire SDK into the main bundle — about 220KB that every
// visitor reading the marketing pages had to download before seeing anything.
// Loaded here, the SDK only arrives when someone actually opens the portal.
//
// Route chunks use App's Suspense boundary. The shared overlay lives outside
// that boundary so suspension cannot restart the loading animation.
export default function PortalLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </AuthProvider>
  );
}
