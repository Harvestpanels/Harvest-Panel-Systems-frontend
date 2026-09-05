// Vercel Edge Function — receives the contact form's FormData directly
// (no client-side JSON conversion needed, and Edge's native
// `Request.formData()` parses multipart/form-data, including the file
// attachment, without extra dependencies) and relays it as an email via
// Resend's HTTP API.
//
// Edge runtime (not the default Node runtime) specifically because it
// gives us the standard Fetch API's `Request`/`FormData`/`File`, which is
// what the Contact form on the client already builds — a Node serverless
// function would need a separate multipart-parsing library (formidable/
// busboy) to get the same thing.
//
// Required environment variables (set in the Vercel project's dashboard,
// not committed here):
//   RESEND_API_KEY   - from https://resend.com/api-keys
//   CONTACT_TO_EMAIL - inbox that should receive submissions (defaults to
//                      Sales@harvestpanels.com, matching src/data/site.js)
//   CONTACT_FROM_EMAIL - the "from" address Resend sends as; MUST be on a
//                      domain verified in the Resend dashboard (Resend
//                      rejects sends from unverified domains) — falls
//                      back to Resend's own shared onboarding@resend.dev
//                      sender if unset, which works immediately but is
//                      only meant for testing, not real production mail.
export const config = { runtime: "edge" };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Mirrors validateForm in src/utils/validation.js — re-checked here
// because this endpoint can be hit directly (not just through the form's
// own client-side validation), so it can't trust the client at all.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
// Matches the file picker's own `accept` attribute in Contact.jsx — that
// attribute is only a UI hint (trivially bypassed by drag-and-drop or a
// direct request to this endpoint), so it's re-checked here by filename
// extension. Resend delivers whatever's attached straight to a real
// inbox, so this is about not letting an executable/script ride along as
// a floor plan, not deep content inspection.
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".dwg", ".png", ".jpg", ".jpeg"];

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Blocks other websites from pointing their own <form> (or a script) at
// this endpoint and sending mail through your Resend account on your
// dime. Checked against the browser-set Origin header, which JavaScript
// on a page can't spoof — allows your production domain, its www
// variant, and any Vercel preview/deployment URL for this project (which
// all end in .vercel.app), and is lenient (doesn't block) when the header
// is simply absent, since some non-browser or older-browser requests omit
// it and blocking those blindly would risk false positives.
const ALLOWED_ORIGIN_SUFFIXES = ["harvestpanels.com", ".vercel.app"];

function isAllowedOrigin(originHeader) {
  if (!originHeader) return true;
  try {
    const host = new URL(originHeader).hostname;
    return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix));
  } catch {
    return false;
  }
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  if (!isAllowedOrigin(request.headers.get("origin"))) {
    console.error("contact form: rejected request from disallowed origin", request.headers.get("origin"));
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Server misconfiguration, not the visitor's fault — logged so it
    // shows up in Vercel's function logs, but the visitor just sees a
    // generic failure (handled by the client's catch block).
    console.error("contact form: RESEND_API_KEY is not set");
    return new Response(JSON.stringify({ error: "Server is not configured to send email yet." }), { status: 500 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Could not read the submitted form." }), { status: 400 });
  }

  // Honeypot (see the "hp_hidden_check" field in Contact.jsx) — invisible
  // to real visitors, so anything filling it in is a bot. Return a fake
  // success rather than a 4xx: a real error response teaches scripted spam
  // to adjust and retry, while a silent "success" gives it no signal at all
  // and it moves on.
  if (formData.get("hp_hidden_check")?.toString().trim()) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const phone = formData.get("phone")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";
  const attachment = formData.get("attachment");
  const hasAttachment = attachment && typeof attachment === "object" && "size" in attachment && attachment.size > 0;

  const errors = {};
  if (!name) errors.name = "Name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";
  if (!phone) errors.phone = "Phone number is required.";
  else {
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) errors.phone = "Enter a valid phone number.";
  }
  if (hasAttachment && attachment.size > MAX_ATTACHMENT_BYTES) {
    errors.attachment = "File is too large, please attach something under 10MB.";
  } else if (hasAttachment) {
    const lowerName = (attachment.name || "").toLowerCase();
    const hasAllowedExtension = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedExtension) {
      errors.attachment = "Please attach a PDF, DWG, PNG, or JPG file.";
    }
  }
  if (Object.keys(errors).length > 0) {
    return new Response(JSON.stringify({ errors }), { status: 422 });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || "Sales@harvestpanels.com";
  const fromEmail = process.env.CONTACT_FROM_EMAIL || "Harvest Panel Systems Website <onboarding@resend.dev>";

  const payload = {
    from: fromEmail,
    to: [toEmail],
    reply_to: email,
    subject: `New inquiry from ${name} (Harvest Panel Systems website)`,
    html: `
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Message:</strong></p>
      <p>${message ? escapeHtml(message).replace(/\n/g, "<br>") : "<em>No message provided.</em>"}</p>
    `,
  };

  if (hasAttachment) {
    // Resend's attachments take base64 content directly — no upload step,
    // no temp storage needed, the whole file just rides along in the same
    // request body Edge already parsed above. Built with btoa/
    // String.fromCharCode rather than Node's Buffer — the Edge runtime is
    // a V8 isolate, not Node, so Buffer isn't available here.
    const bytes = new Uint8Array(await attachment.arrayBuffer());
    let binary = "";
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
    }
    payload.attachments = [{ filename: attachment.name || "attachment", content: btoa(binary) }];
  }

  let resendResponse;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("contact form: network error calling Resend", err);
    return new Response(JSON.stringify({ error: "Could not reach the email service. Please try again." }), { status: 502 });
  }

  if (!resendResponse.ok) {
    const detail = await resendResponse.text().catch(() => "");
    console.error("contact form: Resend rejected the request", resendResponse.status, detail);
    return new Response(JSON.stringify({ error: "The email service rejected the message. Please try again." }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}
