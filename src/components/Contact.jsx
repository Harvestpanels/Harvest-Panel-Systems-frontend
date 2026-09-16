import "./Contact.css";
import { CONTACT } from "../data/site";
import PipedriveForm from "./PipedriveForm";

// The enquiry form is Pipedrive's hosted web form (see PipedriveForm.jsx),
// so submissions become Pipedrive leads directly rather than going through
// this site's own /api/contact + Resend path. The section keeps its own
// contact-details column beside it, unchanged.
export default function Contact({ registerReveal }) {
  return (
    <section className="hp-section" id="contact">
      <div className="hp-section__inner">
        <div className="hp-glass hp-contact__grid">
          <div className="hp-contact__info">
            <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>Contact us</p>
            <h2 className="hp-reveal" ref={registerReveal}>Email now for more information</h2>
            <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>Better yet, see us in person! We love our customers, so feel free to visit during normal business hours.</p>
            <ul className="hp-contact__details hp-reveal" ref={registerReveal}>
              <li>
                <strong>Address</strong>
                <span>{CONTACT.address}</span>
              </li>
              <li>
                <strong>Phone</strong>
                <span><a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a></span>
              </li>
              <li>
                <strong>Email</strong>
                <span><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></span>
              </li>
            </ul>

            {/* Fills the column beside the (taller) form, and answers what
                someone is most likely wondering right before they hit send.
                Every line is drawn from copy already published elsewhere on
                the site — Who We Are for availability/how-we-work, the FAQ
                entries for estimates, lead times and licensing — so this
                block states nothing new about the business. */}
            <ul className="hp-contact__facts hp-reveal" ref={registerReveal}>
              <li>
                <strong>Free estimates</strong>
                <span>Design assistance, budgeting, and a no-cost estimate on every project.</span>
              </li>
              <li>
                <strong>Lead times</strong>
                <span>Stock panels ship within days. Custom orders typically 3&ndash;8 weeks.</span>
              </li>
              <li>
                <strong>Installation</strong>
                <span>An in-house crew, backed by nationwide contractor partnerships.</span>
              </li>
              <li>
                <strong>Licensed &amp; insured</strong>
                <span>Fully licensed and insured for panel and door installation nationwide.</span>
              </li>
              <li>
                <strong>Markets served</strong>
                <span>Cultivation, cold storage, data centre, industrial, commercial, and residential.</span>
              </li>
              <li>
                <strong>What we supply</strong>
                <span>Panels and doors in PIR, EPS, PVC, and mineral wool cores, plus trim and hardware.</span>
              </li>
            </ul>
          </div>

          <div className="hp-contact__form-col hp-reveal" ref={registerReveal}>
            <PipedriveForm className="hp-contact__pipedrive" />
            <p className="hp-contact__legal">By submitting this form you agree to be contacted by Harvest Panel Systems regarding your inquiry.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
