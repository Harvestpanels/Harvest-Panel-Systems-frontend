const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Most mail-relay/upload backends reject attachments well before 25MB;
// capped lower here so the visitor finds out immediately instead of after
// a failed submission.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
// Mirrors ALLOWED_ATTACHMENT_EXTENSIONS in api/contact.js — that's the
// enforcement that actually matters (this file's checks only run in the
// browser, easy to bypass), but repeating it here means a visitor sees
// the rejection immediately instead of after a round trip to the server.
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".dwg", ".png", ".jpg", ".jpeg"];

export function validateForm(data) {
  const errors = {};
  const name = data.get("name")?.toString().trim() ?? "";
  const email = data.get("email")?.toString().trim() ?? "";
  const phone = data.get("phone")?.toString().trim() ?? "";
  const phoneDigits = phone.replace(/\D/g, "");
  const attachment = data.get("attachment");

  if (!name) errors.name = "Name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";
  if (!phone) errors.phone = "Phone number is required.";
  else if (phoneDigits.length < 10 || phoneDigits.length > 15) errors.phone = "Enter a valid phone number.";
  if (attachment && attachment.size > MAX_ATTACHMENT_BYTES) {
    errors.attachment = "File is too large, please attach something under 10MB.";
  } else if (attachment && attachment.size > 0) {
    const lowerName = (attachment.name || "").toLowerCase();
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      errors.attachment = "Please attach a PDF, DWG, PNG, or JPG file.";
    }
  }

  return errors;
}
