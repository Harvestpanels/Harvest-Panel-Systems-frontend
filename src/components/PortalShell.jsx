import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/General/harvest_panels_logo.png";
import { useAuth } from "../hooks/useAuth";
import "../pages/Portal.css";

// Deliberately NOT the marketing <Nav>. That one is built around scroll
// position, in-page section dropdowns and a hero that these screens do not
// have. A portal wants a plain bar: who you are, and the way out.
export default function PortalShell({ children }) {
  const { session, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/portal/login", { replace: true });
  }

  return (
    <div className="hp-portal">
      <header className="hp-portal__bar">
        <Link to="/" aria-label="Harvest Panel Systems home">
          <img className="hp-portal__bar-logo" src={logo} alt="Harvest Panel Systems" />
        </Link>
        {session && (
          <div className="hp-portal__bar-right">
            <span className="hp-portal__who">{profile?.email}</span>
            {isAdmin && <Link className="hp-portal__link" to="/portal/admin">Admin</Link>}
            <button type="button" className="hp-portal__link" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
