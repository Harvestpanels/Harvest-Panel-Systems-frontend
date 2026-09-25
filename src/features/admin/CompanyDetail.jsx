import { useState } from "react";
import AdminDocumentList from "../documents/AdminDocumentList";
import { deleteEmptyCompany, moveProfile, renameCompany, uploadDocument } from "../documents/api";
import PeopleList from "./PeopleList";

// Everything for one company on one screen: its documents (upload + list),
// its people (and adding others to it), and renaming or deleting it.
export default function CompanyDetail({ company, profileId, onBack, onChanged, onMessage }) {
  const [name, setName] = useState(company.company_name);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(company.company_name);
  const [busy, setBusy] = useState(null);
  const [docRevision, setDocRevision] = useState(0);
  const [peopleRevision, setPeopleRevision] = useState(0);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    const element = e.currentTarget;
    const form = new FormData(element);
    setBusy("upload");
    onMessage(null);
    try {
      await uploadDocument({ file: form.get("file"), accountId: company.id, title: String(form.get("title") || ""), profileId });
      element.reset();
      setDocRevision((n) => n + 1);
      onChanged();
      onMessage({ type: "ok", text: `Uploaded and shared with ${name}.` });
    } catch (error) {
      onMessage({ type: "error", text: error.message || "Upload failed. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function handleRename(e) {
    e.preventDefault();
    setBusy("rename");
    onMessage(null);
    try {
      const updated = await renameCompany(company.id, draft);
      setName(updated.company_name);
      setRenaming(false);
      onChanged();
      onMessage({ type: "ok", text: `Renamed to ${updated.company_name}.` });
    } catch (error) {
      onMessage({ type: "error", text: error.message || "The company could not be renamed." });
    } finally {
      setBusy(null);
    }
  }

  async function addPerson(person) {
    setBusy(person.id);
    onMessage(null);
    try {
      await moveProfile(person.id, company.id);
      setPeopleRevision((n) => n + 1);
      onChanged();
      onMessage({ type: "ok", text: `${person.full_name || person.email} is now in ${name}.` });
    } catch {
      onMessage({ type: "error", text: "That person could not be moved. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy("delete");
    onMessage(null);
    try {
      await deleteEmptyCompany(company.id);
      onChanged();
      onMessage({ type: "ok", text: `Deleted ${name}.` });
      onBack();
    } catch (error) {
      setConfirmDelete(false);
      onMessage({ type: "error", text: error.message || "The company could not be deleted." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="hp-admin">
      <div className="hp-company-head hp-reveal">
        <button type="button" className="hp-admin__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          All companies
        </button>
        {renaming ? (
          <form className="hp-company-rename hp-portal-form hp-portal-form--dark" onSubmit={handleRename}>
            <label htmlFor="company-name">Company name</label>
            <div className="hp-company-rename__row">
              <input id="company-name" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} />
              <button type="submit" className="hp-btn hp-btn--primary" disabled={busy === "rename"}>{busy === "rename" ? "Saving..." : "Save"}</button>
              <button type="button" className="hp-btn hp-btn--ghost" onClick={() => { setRenaming(false); setDraft(name); }}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="hp-company-head__title">
            <span className="hp-company__mark hp-company__mark--lg" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
            <h2>{name}</h2>
            <button type="button" className="hp-btn hp-btn--ghost" onClick={() => setRenaming(true)}>Rename</button>
          </div>
        )}
      </div>

      <div className="hp-admin__row">
        <section className="hp-panel hp-reveal">
          <h2>Share a document</h2>
          <p className="hp-panel__note">Everyone in {name} will see it in their portal.</p>
          <form className="hp-portal-form hp-portal-form--dark" onSubmit={handleUpload}>
            <label htmlFor="a-title">Document title</label>
            <input id="a-title" name="title" type="text" placeholder="Leave blank to use the file name" />
            <label htmlFor="a-file">File</label>
            <input id="a-file" name="file" type="file" required />
            <button type="submit" className="hp-btn hp-btn--primary" disabled={busy === "upload"}>
              {busy === "upload" ? "Uploading..." : "Upload and share"}
            </button>
          </form>
        </section>

        <section className="hp-panel hp-reveal">
          <h2>Documents</h2>
          <p className="hp-panel__note">Deleting a document removes it for everyone in {name}.</p>
          <AdminDocumentList account={{ id: company.id, company_name: name }} revision={docRevision} onMessage={onMessage} />
        </section>
      </div>

      <section className="hp-panel hp-reveal">
        <div className="hp-admin__section-head">
          <div>
            <h2>People in {name}</h2>
            <p className="hp-panel__note">They all see this company's documents.</p>
          </div>
          <button type="button" className={"hp-btn " + (adding ? "hp-btn--ghost" : "hp-btn--primary")} onClick={() => setAdding((v) => !v)}>
            {adding ? "Done adding" : "Add people"}
          </button>
        </div>

        {adding && (
          <div className="hp-admin__add">
            <p className="hp-panel__note">Pick someone to move them into {name}. They leave their current company.</p>
            <PeopleList id="add-people-search" searchLabel="Find people to add" notInAccount={company.id} showCompany
              emptyText="Everyone is already in this company." revision={peopleRevision}
              action={(p) => (
                <button type="button" className="hp-btn hp-btn--ghost" disabled={busy !== null} onClick={() => addPerson(p)}>
                  {busy === p.id ? "Adding..." : "Add to " + name}
                </button>
              )} />
          </div>
        )}

        <PeopleList id="member-search" searchLabel="Search people in this company" inAccount={company.id}
          emptyText="No one is in this company yet." revision={peopleRevision} />
      </section>

      <section className="hp-panel hp-panel--danger hp-reveal">
        <h2>Delete company</h2>
        <p className="hp-panel__note">
          Only possible once it has no people and no documents, for example a company left behind by a deleted test signup.
        </p>
        {confirmDelete ? (
          <div className="hp-doc__actions">
            <button type="button" className="hp-btn hp-btn--danger" disabled={busy === "delete"} onClick={handleDelete}>
              {busy === "delete" ? "Deleting..." : "Delete " + name}
            </button>
            <button type="button" className="hp-btn hp-btn--ghost" disabled={busy === "delete"} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="hp-btn hp-btn--ghost" onClick={() => setConfirmDelete(true)}>Delete company</button>
        )}
      </section>
    </div>
  );
}
