import { useEffect, useRef } from "react";

// The live Pipedrive web form. Submissions land directly in Pipedrive as
// leads rather than going through this site's own /api/contact + Resend
// path, so there is no request for us to validate, send, or report on here.
const PIPEDRIVE_FORM_URL =
  "https://webforms.pipedrive.com/f/2TX2SJAqKiipmv075m9ytYMz49Art5mJqNLHQfSDU8qG0dKRMoIgTh7VMysU28GwH";

const PIPEDRIVE_LOADER_SRC = "https://webforms.pipedrive.com/f/loader";

// Pipedrive publishes this embed as a plain HTML snippet: a
// .pipedriveWebForms div with a <script> inside it. That snippet cannot be
// dropped into JSX as-is — React never executes a <script> tag it renders,
// so the form would silently never appear.
//
// The loader also only scans the document for containers at the moment it
// executes, and this is a single-page app where <Contact> mounts and
// unmounts on every route change. A script loaded once on the first page
// would not pick up the container rendered on the next one. So the whole
// snippet is built imperatively here, per mount: a fresh <script> element
// re-executes the loader (the file itself is served from cache) and it finds
// this instance's container.
//
// The host div stays empty in JSX and React never owns anything inside it —
// the container and script are created and torn down here. Letting React
// render children that the third-party loader then replaces with its iframe
// would leave React trying to remove nodes that are no longer its own.
export default function PipedriveForm({ className }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const container = document.createElement("div");
    container.className = "pipedriveWebForms";
    container.dataset.pdWebforms = PIPEDRIVE_FORM_URL;

    const script = document.createElement("script");
    script.src = PIPEDRIVE_LOADER_SRC;
    script.async = true;

    container.appendChild(script);
    host.appendChild(container);

    // Clear on unmount so the next mount's loader sees exactly one
    // unprocessed container and cannot render the form twice.
    return () => {
      host.replaceChildren();
    };
  }, []);

  return <div className={className} ref={hostRef} />;
}
