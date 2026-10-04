import logoUrl from "../assets/attach1.png";
import type { BackendApplication } from "./platform";

export type ApplicationStatus =
  | "Submitted"
  | "Under Review"
  | "Shortlisted"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";
export type PaymentStatus =
  | "Payment Pending"
  | "Payment Successful"
  | "Payment Failed";

export interface ApplicationRecord {
  reference: string;
  ownerEmail: string;
  opportunity: string;
  company: string;
  companyAddress?: string;
  suggestedCompany?: string;
  gender?: string;
  applicantName: string;
  applicantEmail: string;
  studentIndexNumber: string;
  yearOfStudy?: string;
  applicationDate: string;
  lastUpdated: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  resumeName: string;
  resumeType: string;
  resumeUploadedAt: string;
  applicationLetterAvailable: boolean;
  details?: Record<string, unknown>;
}

export function fromBackendApplication(
  application: BackendApplication,
  ownerEmail: string,
): ApplicationRecord {
  const status: Record<string, ApplicationStatus> = {
    submitted: "Submitted",
    review: "Under Review",
    interview: "Shortlisted",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };
  return {
    reference: application.id,
    ownerEmail,
    opportunity: application.program_name,
    company: application.host_company_name || "",
    companyAddress: application.host_company_address || "",
    suggestedCompany: application.suggested_company || "",
    gender: application.gender || "",
    applicantName: application.applicant_name || "",
    applicantEmail: ownerEmail,
    studentIndexNumber: application.student_index_number || "",
    yearOfStudy: application.year_of_study || "",
    applicationDate: application.created_at,
    lastUpdated: application.created_at,
    status: status[application.status.toLowerCase()] || "Submitted",
    paymentStatus: "Payment Pending",
    paymentReference: "",
    resumeName: application.resume_filename || "",
    resumeType: "",
    resumeUploadedAt: application.created_at,
    applicationLetterAvailable: false,
    details: {
      personalInformation: {
        institution: application.applicant_institution || "",
        program: application.applicant_course || "",
        phone: application.applicant_contact || "",
      },
    },
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}

async function getLogoDataUrl() {
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export async function printApplicationLetter(application: ApplicationRecord) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const details = (application.details?.personalInformation || {}) as Record<
    string,
    unknown
  >;
  const detail = (key: string, fallback = "") =>
    typeof details[key] === "string" ? String(details[key]) : fallback;
  const [
    logo,
    name,
    company,
    companyAddress,
    opportunity,
    reference,
    indexNumber,
    email,
    date,
  ] = await Promise.all([
    getLogoDataUrl(),
    escapeHtml(application.applicantName),
    escapeHtml(application.company),
    escapeHtml(application.companyAddress || detail("companyAddress")),
    escapeHtml(application.opportunity),
    escapeHtml(application.reference),
    escapeHtml(application.studentIndexNumber),
    escapeHtml(application.applicantEmail),
    escapeHtml(new Date(application.applicationDate).toLocaleDateString()),
  ]);
  const institution = escapeHtml(detail("institution"));
  const program = escapeHtml(detail("program"));
  const contact = escapeHtml(detail("phone"));
  const logoMarkup = logo
    ? `<img class="logo-image" src="${logo}" alt="Fortune Intern Network logo">`
    : `<div class="logo-word">FORTUNE</div>`;
  const watermark = logo ? `<img class="watermark" src="${logo}" alt="">` : "";
  const signatureMarkup = `<div class="signature">Yours sincerely,<br><svg class="signature-mark" viewBox="0 0 200 150" aria-label="Official signature"><g fill="none" stroke="#2B3A9E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M112 22C84 6 44 16 30 48c-14 34-6 68 28 82 30 12 64 4 74-18 4-10 0-18-8-20"/><path d="M66 46c8-8 18-8 22-2M70 46c-2 16-4 34-4 52M68 72c6-4 12-4 16-2M84 98c4-14 8-26 12-32 3 10 5 22 7 32 4-14 8-26 12-32 3 10 5 22 7 32M108 64c-6-20 4-36 14-32 10 4 6 22-8 28M128 100c12-8 26-10 40-6-9 5-15 11-13 18"/></g></svg><b>Emmanuel Amoasi</b><br><strong>Managing Director</strong><br>Fortune Intern Network</div>`;
  let html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Fortune Intern Network - Internship Letter</title><style>*{box-sizing:border-box}body{margin:0;background:#46505e;font-family:Arial,Helvetica,sans-serif;padding:24px 12px;color:#16202e}.sheet{width:min(210mm,100%);min-height:296mm;margin:auto;background:#f8fafc;box-shadow:0 22px 60px rgba(0,0,0,.55);position:relative;overflow:hidden;padding:31mm 18mm 24mm}.band{position:absolute;left:0;right:0;height:8mm;background:#e9b427;z-index:3}.top{top:0}.bottom{bottom:0}.corner{position:absolute;width:25mm;height:22mm;background:#0a3161;z-index:4}.tr{top:0;right:0;clip-path:polygon(45% 0,100% 0,100% 100%)}.bl{bottom:0;left:0;clip-path:polygon(0 0,0 100%,100% 100%)}.header{position:relative;z-index:5;text-align:center;margin-bottom:14px}.logo-image{width:40mm;height:34mm;object-fit:contain;display:block;margin:auto}.logo-word{font-weight:900;font-size:25px;letter-spacing:2px;color:#12365e}.content{position:relative;z-index:5}.watermark{position:absolute;z-index:1;width:95mm;height:95mm;object-fit:contain;opacity:.1;top:52%;left:50%;transform:translate(-50%,-50%)}.ref{display:flex;justify-content:space-between;margin:8px 0 22px;font-size:13px;font-weight:700;color:#12365e}.row{display:flex;gap:12px;margin:9px 0;font-size:13px}.label{width:180px;font-weight:700}.value{flex:1}.address{margin-top:28px;font-weight:700;text-transform:uppercase;line-height:1.6}.subject{text-align:center;text-decoration:underline;font-weight:800;margin:24px 0 20px;text-transform:uppercase}.para{line-height:1.7;margin:0 0 16px}.signature{margin-top:28px;line-height:1.6;font-weight:700}.signature-mark{display:block;width:38mm;height:25mm}.footer-text{position:absolute;bottom:2mm;left:0;right:0;text-align:center;z-index:6;color:#12365e;font-size:12px;font-weight:800}@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;margin:0}}</style></head><body><main class="sheet"><div class="band top"></div><div class="band bottom"></div><div class="corner tr"></div><div class="corner bl"></div><header class="header">${logoMarkup}</header>${watermark}<div class="content"><div class="ref"><span>Our Ref: ${reference}</span><span>${date}</span></div><div class="row"><div class="label">NAME OF STUDENT:</div><div class="value">${name}</div></div><div class="row"><div class="label">INSTITUTION:</div><div class="value">${institution}</div></div><div class="row"><div class="label">INDEX NUMBER:</div><div class="value">${indexNumber}</div></div><div class="row"><div class="label">CONTACT:</div><div class="value">${contact}</div></div><div class="row"><div class="label">PROGRAM / COURSE OF STUDY:</div><div class="value">${program}</div></div><div class="row"><div class="label">EMAIL ADDRESS:</div><div class="value">${email}</div></div><div class="address">THE HUMAN RESOURCE MANAGER<br>${company}<br>${companyAddress}</div><p class="para">Dear Sir/Madam,</p><div class="subject">INTERNSHIP / ATTACHMENT</div><p class="para">We write on behalf of the Fortune Intern Network (FIN) to recommend <b>${name}</b>, a student of ${institution} reading ${program}, for an internship/industrial attachment opportunity in your esteemed organization.</p><p class="para">We believe this internship will provide valuable practical experience, strengthen professional skills, and complement the applicant's academic training. We are confident that the applicant will demonstrate discipline, professionalism, and a strong commitment throughout the internship.</p><p class="para">We kindly request that you consider granting this opportunity for a duration that suits your organization's schedule. For any further information, please feel free to contact us using the organization's official contact information.</p><p class="para">Thank you for your support and consideration.</p>${signatureMarkup}</div><div class="footer-text">LinkedIn · X · WhatsApp · Fortune Intern Network · 0200313672</div></main></body></html>`;
  html = html.replace("<style>", "<style>@page{size:A4 portrait;margin:0}");
  printWindow.addEventListener(
    "load",
    () => {
      printWindow.focus();
      printWindow.print();
    },
    { once: true },
  );
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
