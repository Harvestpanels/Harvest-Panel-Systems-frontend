import { useState } from "react";
import PortalShell from "../components/PortalShell";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import CompanyList from "../features/admin/CompanyList";
import CompanyDetail from "../features/admin/CompanyDetail";
import PeopleList from "../features/admin/PeopleList";
import { usePageMeta } from "../hooks/usePageMeta";
import Notify from "../components/toast/Notify";

// Admin-only. Two tabs: Companies (open one to share documents with it and
// manage its people) and People (everyone, with the company they belong to).
//
// Every write is also gated by RLS (accounts_admin_write, documents_admin_write,
// profiles_admin_write). Hiding this route from non-admins is a courtesy; the
// database is what actually refuses a non-admin who calls the API directly.
export default function PortalAdminPage() {
  usePageMeta({ title: "Admin | Harvest Panel Systems", description: "Portal administration.", path: "/portal/admin", noindex: true });
  const { profile } = useAuth();
  const [tab, setTab] = useState("companies");
  const [company, setCompany] = useState(null);
  const [msg, setMsg] = useState(null);
  // Bumped whenever a company's people or documents change, so the company
  // list's counts are fresh when you go back to it.
  const [revision, setRevision] = useState(0);

  function openCompany(next) {
    setMsg(null);
    setTab("companies");
    setCompany(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function switchTab(next) {
    setMsg(null);
    setCompany(null);
    setTab(next);
  }

  return (
    <PortalShell>
      <main className="hp-portal__main">
        <p className="hp-portal__company hp-reveal">Admin</p>
        <h1 className="hp-portal__title hp-reveal">Admin tools</h1>
        <p className="hp-portal__hint hp-reveal">
          Share documents with customer companies and manage who belongs to each one.
          {" "}<Link to="/portal">Back to your documents</Link>
        </p>

        <div className="hp-admin-tabs hp-reveal" role="tablist" aria-label="Admin sections">
          {[["companies", "Companies"], ["people", "People"]].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id}
              className={"hp-admin-tab" + (tab === id ? " is-active" : "")} onClick={() => switchTab(id)}>
              {label}
            </button>
          ))}
        </div>

        <Notify text={msg?.text} type={msg?.type === "ok" ? "ok" : "error"} />

        {tab === "companies" && (company ? (
          <CompanyDetail key={company.id} company={company} profileId={profile?.id}
            onBack={() => setCompany(null)} onChanged={() => setRevision((n) => n + 1)} onMessage={setMsg} />
        ) : (
          <div className="hp-admin">
            <CompanyList onOpen={openCompany} revision={revision} />
          </div>
        ))}

        {tab === "people" && (
          <div className="hp-admin">
            <section className="hp-panel hp-reveal">
              <h2>People</h2>
              <p className="hp-panel__note">
                Everyone with a portal login and the company they belong to. Open a company to move people into it.
              </p>
              <PeopleList id="people-search" searchLabel="Search people" showCompany onOpenCompany={openCompany}
                emptyText="No one has signed up yet." revision={revision}
                action={(p) => p.account_id && (
                  <button type="button" className="hp-btn hp-btn--ghost"
                    onClick={() => openCompany({ id: p.account_id, company_name: p.company_name })}>
                    Open company
                  </button>
                )} />
            </section>
          </div>
        )}
      </main>
    </PortalShell>
  );
}
