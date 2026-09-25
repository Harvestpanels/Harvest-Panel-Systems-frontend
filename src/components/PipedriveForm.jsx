import { useEffect, useRef, useState } from "react";
import { reportError } from "../utils/errorReporting.js";
import { CONTACT } from "../data/site";
import Notify from "./toast/Notify";

const FORM_URL = "https://webforms.pipedrive.com/f/2TX2SJAqKiipmv075m9ytYMz49Art5mJqNLHQfSDU8qG0dKRMoIgTh7VMysU28GwH";
const LOADER_SRC = "https://webforms.pipedrive.com/f/loader";

export default function PipedriveForm({ className }) {
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const container = document.createElement('div');
    container.className = 'pipedriveWebForms';
    container.dataset.pdWebforms = FORM_URL;
    const script = document.createElement('script');
    script.src = LOADER_SRC;
    script.async = true;
    let active = true;
    let frame;
    const fail = code => {
      if (!active) return;
      setFailed(true);
      reportError(code);
    };
    const timer = window.setTimeout(() => fail('pipedrive_timeout'), 15000);
    const onLoad = () => {
      if (!active) return;
      window.clearTimeout(timer);
      setFailed(false);
    };
    const observeFrame = () => {
      const next = container.querySelector('iframe');
      if (!next || next === frame) return;
      frame?.removeEventListener('load', onLoad);
      frame = next;
      frame.addEventListener('load', onLoad);
    };
    const observer = new MutationObserver(observeFrame);
    observer.observe(container, { childList: true, subtree: true });
    script.onerror = () => {
      window.clearTimeout(timer);
      fail('pipedrive_load_error');
    };
    container.appendChild(script);
    host.appendChild(container);
    return () => {
      active = false;
      window.clearTimeout(timer);
      observer.disconnect();
      frame?.removeEventListener('load', onLoad);
      script.onerror = null;
      host.replaceChildren();
    };
  }, []);

  return (
    <div className={className}>
      <div ref={hostRef} />
      <Notify text={failed ? `The contact form couldn't load. Please email ${CONTACT.email} or call ${CONTACT.phone}.` : null} />
      {/* Always available: iframe load cannot prove a cross-origin form is usable. */}
      <p>You can also email <a href="mailto:Sales@harvestpanels.com">Sales@harvestpanels.com</a>.</p>
    </div>
  );
}
