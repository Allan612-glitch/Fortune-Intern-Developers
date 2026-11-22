import { getOpportunityState, updateOpportunityState, type OpportunityDraft } from "../services/opportunities";
import { useRef } from "react";
import { apiBlob, apiRequest } from "../services/api";
import { previewPdf, saveFile } from "./AdminReportActions";
import ProfilePhotoField from "./ProfilePhotoField";
import { downloadProfileDocument, getProfile, listProfileDocuments, type ProfileDocument } from "../services/auth";
import { useEffect, useId, useState } from "react";
import {
  fromBackendApplication,
  type ApplicationRecord,
} from "../services/applications";
import { submitApplication } from "../services/platform";
import logo from "../assets/attach1.png";

const universities = [
  "University of Ghana",
  "KNUST",
  "University of Cape Coast",
  "Ashesi University",
  "University of Education, Winneba",
  "University for Development Studies",
  "University of Health and Allied Sciences",
  "University of Professional Studies, Accra",
  "GIMPA",
  "University of Energy and Natural Resources",
  "University of Mines and Technology",
  "Accra Technical University",
  "Other",
];
const partnerCompanies = [
  "Flutterwave",
  "Access Bank Ghana",
  "Andela",
  "MTN Ghana",
  "Vodafone Ghana",
  "GCB Bank",
  "Hubtel",
  "Farmerline",
  "Ecobank Ghana",
  "Stanbic Bank Ghana",
  "Absa Ghana",
  "Fidelity Bank Ghana",
  "AirtelTigo Ghana",
  "Ghana Revenue Authority",
  "Agricultural Development Bank",
  "TechGhana",
  "Jumia Ghana",
  "Zipline Ghana",
  "mPharma",
  "Zooto",
  "Paystack Ghana",
  "Interswitch Ghana",
  "Omni Bank",
];
const years = [
  "Level 100",
  "Level 200",
  "Level 300",
  "Level 400",
  "Level 500",
  "Other",
];

type PaystackWindow = typeof window & {
  PaystackPop?: {
    setup: (options: Record<string, unknown>) => { openIframe: () => void };
  };
};
function loadPaystack() {
  const win = window as PaystackWindow;
  if (win.PaystackPop) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

interface Props {
  prefilledCompany?: string;
  prefilledRole?: string;
  programId?: string;
  ownerEmail?: string;
  ownerName?: string;
  onClose: () => void;
  onViewApplications?: () => void;
  onBackDashboard?: () => void;
}
export default function ApplyFormModal({
  prefilledCompany = "",
  prefilledRole = "",
  programId,
  ownerEmail = "",
  ownerName = "",
  onClose,
  onViewApplications,
  onBackDashboard,
}: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState("");
  const paymentKey = `fortune-pending-payment:${ownerEmail}:${programId || prefilledRole}`;
  const [retryPayment, setRetryPayment] = useState(() => localStorage.getItem(paymentKey) || "");
  const [receiptId, setReceiptId] = useState("");
  const [testPayment, setTestPayment] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [submittedApplication, setSubmittedApplication] =
    useState<ApplicationRecord | null>(null);
  const [error, setError] = useState("");
  const resumeInputId = useId();
  const [resume, setResume] = useState<File | null>(null);
  const edited = useRef(new Set<string>());
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [draftNotice, setDraftNotice] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: ownerName.trim().split(/\s+/)[0] || "",
    lastName: ownerName.trim().split(/\s+/).slice(1).join(" "),
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: ownerEmail,
    institution: "",
    otherInstitution: "",
    program: "",
    year: "",
    indexNumber: "",
    companyName: prefilledCompany,
    companyAddress: "",
    suggestedCompany: "",
  });
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getProfile(), programId ? getOpportunityState(programId) : Promise.resolve(null),
    ]).then(([profileResult, draftResult]) => {
      if (!active) return;
      const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
      setPhoto(profile?.profile_picture || null);
      const school = profile?.university || "";
      const year = profile?.year_of_study ? "Level " + profile.year_of_study * 100 : "";
      const prefill: OpportunityDraft = {
        phone: profile?.phone_number || "",
        institution: school && !universities.includes(school) ? "Other" : school,
        otherInstitution: school && !universities.includes(school) ? school : "",
        program: profile?.major || profile?.course || "",
        year: year && !years.includes(year) ? "Other" : year,
        indexNumber: profile?.student_index_number || "",
      };
      const stored = draftResult.status === "fulfilled" ? draftResult.value?.draft : null;
      const values = { ...prefill, ...stored };
      setForm(current => ({ ...current, ...Object.fromEntries(Object.entries(values)
        .filter(([key]) => !edited.current.has(key))) }));
      if (stored) setDraftNotice("Saved draft restored. Re-enter your date of birth and attach your CV if needed.");
      if (draftResult.status === "rejected") setDraftNotice("Your saved draft could not be loaded. You can still apply.");
    });
    listProfileDocuments().then(items => { if (active) setDocuments(items.filter(item => /\.(pdf|doc|docx)$/i.test(item.filename))); }).catch(() => {});
    return () => { active = false; };
  }, [programId]);

  const set = (key: keyof typeof form, value: string) => {
    edited.current.add(key);
    setForm(current => ({ ...current, [key]: value }));
  };

  async function saveDraft() {
    if (!programId) return;
    setDraftBusy(true); setError(""); setDraftNotice("");
    // The draft contains form text only. Payment references, files and date of birth stay out.
    const draft: OpportunityDraft = {
      firstName: form.firstName, lastName: form.lastName, phone: form.phone, gender: form.gender,
      institution: form.institution, otherInstitution: form.otherInstitution, program: form.program, year: form.year,
      indexNumber: form.indexNumber, companyName: form.companyName, companyAddress: form.companyAddress, suggestedCompany: form.suggestedCompany,
    };
    try {
      await updateOpportunityState(programId, { draft });
      setDraftNotice("Draft saved. Find it under Saved and drafts.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save the draft.");
    } finally { setDraftBusy(false); }
  }

  function attachCv(file: File) {
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) return setError("Please upload a PDF, DOC, or DOCX file.");
    if (file.size > 10 * 1024 * 1024) return setError("Your CV must be 10 MB or smaller.");
    if (file.size === 0) return setError("The selected CV is empty.");
    setResume(file); setError("");
  }

  async function attachStoredCv(id: string) {
    const document = documents.find(item => item.id === id);
    if (!document) return;
    setCvBusy(true);
    try {
      const blob = await downloadProfileDocument(id);
      attachCv(new File([blob], document.filename, { type: blob.type || document.content_type || "" }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load your profile document.");
    } finally { setCvBusy(false); }
  }

  const validate = () => {
    const required: Array<keyof typeof form> = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "phone",
      "email",
      "institution",
      "program",
      "year",
      "indexNumber",
      "companyName",
      "companyAddress",
    ];
    if (required.some((key) => !form[key].trim()))
      return "Please complete all required fields.";
    const birthDate = new Date(`${form.dateOfBirth}T00:00:00.000Z`);
    const today = new Date();
    const applicantAge =
      today.getUTCFullYear() -
      birthDate.getUTCFullYear() -
      ((today.getUTCMonth() < birthDate.getUTCMonth() ||
      (today.getUTCMonth() === birthDate.getUTCMonth() &&
        today.getUTCDate() < birthDate.getUTCDate())) ? 1 : 0);
    if (applicantAge < 16)
      return "Applicants under 16 cannot submit applications.";
    if (form.institution === "Other" && !form.otherInstitution.trim())
      return "Please specify your institution.";
    if (!/^0\d{9}$/.test(form.phone))
      return "Enter a valid Ghanaian phone number using 10 digits.";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return "Please enter a valid email address.";
    if (!/^\d{7,8}$/.test(form.indexNumber.trim()))
      return "Enter a valid 7- or 8-digit index number.";
    return "";
  };
  const complete = async (paymentReference: string) => {
    setLoading(true);
    const now = new Date().toISOString();
    const payload = new FormData();
    if (programId) payload.append("program_id", programId);
    else payload.append("program_name", prefilledRole || "Internship Application");
    if (resume) payload.append("resume", resume);
    payload.append("university", form.institution === "Other" ? form.otherInstitution : form.institution);
    payload.append("course", form.program);
    payload.append("phone", form.phone);
    payload.append("companyName", form.companyName);
    payload.append("companyAddress", form.companyAddress);
    payload.append("applicant_name", `${form.firstName} ${form.lastName}`.trim());
    payload.append("date_of_birth", form.dateOfBirth);
    payload.append("gender", form.gender);
    payload.append("student_index_number", form.indexNumber.trim());
    payload.append("year_of_study", form.year);
    payload.append("suggested_company", form.suggestedCompany);
    try {
      const demo = paymentReference.startsWith("FIN-DEMO");
      const payment = !demo ? await apiRequest<{ id: string; test_mode: boolean }>("/api/finance/verify", {
        method: "POST", body: JSON.stringify({ reference: paymentReference }),
      }) : null;
      const result = await submitApplication(payload);
      localStorage.removeItem(paymentKey);
      setReceiptId(payment?.id || "");
      setTestPayment(Boolean(payment?.test_mode));
      const application = {
        ...fromBackendApplication(result),
        company: form.companyName,
        applicantName: `${form.firstName} ${form.lastName}`.trim(),
        studentIndexNumber: form.indexNumber.trim(),
        paymentStatus: paymentReference.startsWith("FIN-DEMO")
          ? "Payment Pending" as const
          : "Payment Successful" as const,
        paymentReference,
        applicationDate: now,
        lastUpdated: now,
      };
      setSubmittedApplication(application);
      setReference(result.id);
      setStep("success");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit your application.");
    } finally {
      setLoading(false);
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || photoBusy) return;
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setLoading(true);
    if (retryPayment) { await complete(retryPayment); return; }
    const win = window as PaystackWindow;
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (publicKey && (await loadPaystack()) && win.PaystackPop) {
      let checkout: { amount_minor: number; currency: string; mode: "test" | "live" };
      try {
        checkout = await apiRequest("/api/finance/checkout");
        if (!publicKey.startsWith(`pk_${checkout.mode}_`)) throw new Error("Checkout keys are configured for different environments.");
      } catch (error) {
        setLoading(false);
        setError(error instanceof Error ? error.message : "Checkout verification is unavailable.");
        return;
      }
      win.PaystackPop.setup({
        key: publicKey,
        email: ownerEmail || form.email,
        amount: checkout.amount_minor,
        currency: checkout.currency,
        ref: `FIN-${crypto.randomUUID()}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Applicant",
              variable_name: "applicant",
              value: `${form.firstName} ${form.lastName}`.trim(),
            },
            {
              display_name: "Index Number",
              variable_name: "index_number",
              value: form.indexNumber,
            },
          ],
        },
        callback: (response: { reference: string }) => {
          localStorage.setItem(paymentKey, response.reference);
          setRetryPayment(response.reference);
          void complete(response.reference);
        },
        onClose: () => setLoading(false),
      }).openIframe();
      return;
    }
    if (!publicKey && import.meta.env.DEV) {
      void complete(`FIN-DEMO-${Date.now().toString().slice(-6)}`);
      return;
    }
    setLoading(false);
    setError("Checkout is unavailable. Please try again later.");
  };
  if (step === "success")
    return (
      <div role="dialog" aria-modal="true" aria-label="Application submitted" className="fixed inset-0 z-[105] bg-black/60 p-3 flex items-center justify-center">
        <div className="rounded-xl bg-card text-foreground shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-3 sm:p-5 text-center">
          <div className="w-20 h-16 mx-auto mb-4 rounded-xl bg-white border border-border flex items-center justify-center">
            <img
              src={logo}
              alt="Fortune Intern Network"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent flex items-center justify-center text-2xl text-primary">
            ✓
          </div>
          <h2 className="text-2xl font-bold mt-5">
            Application Submitted Successfully
          </h2>
          <p className="text-sm text-muted-foreground mt-3">
            {submittedApplication?.status === "Under Review"
              ? "Because you are under 18, your application is under review before a decision; a reviewer will check guardian or institution approval."
              : "Your internship application has been submitted successfully."}
          </p>
          <p className="text-sm font-semibold text-amber-700 mt-3">
            {submittedApplication?.paymentStatus === "Payment Successful"
              ? testPayment ? "Your test payment was verified." : "Your payment was verified."
              : "Payment was not confirmed; the application was submitted in demo mode."}
          </p>
          <div className="bg-secondary rounded-xl p-4 mt-5 text-left space-y-2 text-sm">
            <p>Opportunity: {prefilledRole || "Internship Application"}</p>
            <p>Reference: {reference}</p>
            <p>Submission date: {new Date().toLocaleDateString()}</p>
            <p>Application status: {submittedApplication?.status || "Submitted"}</p>
            <p>Payment status: {submittedApplication?.paymentStatus}</p>
          </div>
          {receiptId && <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm">
            <button type="button" className="min-h-11 font-semibold text-primary underline" onClick={() => {
              void previewPdf(() => apiBlob(`/api/finance/documents/${receiptId}`)).catch(failure => setReceiptError(String(failure.message)));
            }}>Preview receipt</button>
            <button type="button" className="min-h-11 font-semibold text-primary underline" onClick={() => {
              void apiBlob(`/api/finance/documents/${receiptId}`).then(blob => saveFile(blob, `receipt-${receiptId}.pdf`)).catch(failure => setReceiptError(String(failure.message)));
            }}>Download receipt</button>
          </div>}
          {receiptError && <p role="alert" className="mt-2 text-sm">{receiptError}</p>}
          <div className="mt-4 space-y-2 text-left">
            <div className="rounded-xl border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
              Your Certificate of Completion will be sent to your email after
              you complete your internship.
            </div>
            <div className="rounded-xl border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
              During your internship, evaluation forms will be sent to you to
              complete as part of the internship evaluation process.
            </div>
          </div>
          <button
            onClick={onViewApplications || onClose}
            className="w-full mt-3 py-3 rounded-xl bg-primary text-white font-semibold"
          >
            View My Applications
          </button>
          <button
            onClick={onBackDashboard || onClose}
            className="w-full mt-3 py-3 rounded-xl border border-border text-sm font-semibold"
          >
            Back to Programs
          </button>
        </div>
      </div>
    );
  return (
    <div role="dialog" aria-modal="true" aria-label="Internship application form"
      onKeyDown={event => { if (event.key === "Escape" && !loading) { event.stopPropagation(); onClose(); } }} className="fixed inset-0 z-[105] bg-black/60 p-3 flex items-center justify-center">
      <div className="bg-card text-foreground rounded-xl shadow-2xl w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-3 py-2 flex items-center justify-between gap-2 sm:px-4">
          <div>
            <h2 className="font-bold text-base sm:text-lg">
              Internship / Attachment Application Form
            </h2>
            <p className="text-muted-foreground text-xs mt-1">
              Fill in your details then pay to submit. Fields marked * are
              required.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close application form"
            autoFocus
            className="size-10 shrink-0 rounded-lg text-xl hover:bg-secondary"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-3 sm:p-4">
          <ProfilePhotoField photo={photo} initials={(form.firstName[0] || "") + (form.lastName[0] || "")}
            onSaved={setPhoto} onBusyChange={setPhotoBusy} />
          <Section title="Personal Information">
            <Field
              label="First Name *"
              instruction="Enter your official first name as it appears on your student ID or legal documents."
              value={form.firstName}
              onChange={(value) => set("firstName", value)}
            />
            <Field
              label="Last Name *"
              instruction="Enter your official family name/surname."
              value={form.lastName}
              onChange={(value) => set("lastName", value)}
            />
            <label className="block">
              <span className="text-sm font-semibold">Date of Birth *</span>
              <input
                type="date"
                required
                value={form.dateOfBirth}
                onChange={(event) => set("dateOfBirth", event.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Applicants under 16 cannot apply. Students under 18 must have guardian or institution approval; applications are held for review before a decision.
              </span>
            </label>
            <div>
              <span className="text-sm font-semibold">Gender *</span>
              <p className="text-xs text-muted-foreground mt-1">
                Select your gender.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {["Male", "Female"].map((gender) => (
                  <label
                    key={gender}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={gender}
                      checked={form.gender === gender}
                      onChange={(event) => set("gender", event.target.value)}
                    />
                    {gender}
                  </label>
                ))}
              </div>
            </div>
            <Field
              label="Phone Number *"
              instruction="Enter a valid active phone number (digits only, e.g., 054XXXXXXX)."
              value={form.phone}
              onChange={(value) => set("phone", value.replace(/\D/g, ""))}
              placeholder="054XXXXXXX"
            />
            <Field
              label="Email Address *"
              instruction="Enter your primary active email address where you will receive your internship letter."
              value={form.email}
              onChange={(value) => set("email", value)}
              type="email"
            />
          </Section>
          <Section title="Academic Information">
            <Select
              label="Institution Name *"
              instruction={
                'Select your university — top 12 in Ghana listed first. Choose "Other" to specify.'
              }
              value={form.institution}
              onChange={(value) => set("institution", value)}
              options={universities}
            />
            {form.institution === "Other" && (
              <Field
                label="Specify Institution *"
                value={form.otherInstitution}
                onChange={(value) => set("otherInstitution", value)}
              />
            )}
            <Field
              label="Program / Course of Study *"
              instruction="Enter your exact course of study (e.g., Geomatics Engineering)."
              value={form.program}
              onChange={(value) => set("program", value)}
            />
            <Select
              label="Year of Study *"
              instruction="Select your current academic year."
              value={form.year}
              onChange={(value) => set("year", value)}
              options={years}
            />
            <Field
              label="Index Number *"
              instruction="Enter your official student ID or registration index number."
              value={form.indexNumber}
              onChange={(value) => set("indexNumber", value.replace(/\s/g, ""))}
              placeholder="1234567"
              inputMode="numeric"
            />
          </Section>
          <Section title="Company / Placement Information">
            <Field
              label="Company / Organization Name *"
              instruction="Enter the host company or organization name where you are doing your internship."
              value={form.companyName}
              onChange={(value) => set("companyName", value)}
            />
            <Field
              label="Company Address *"
              instruction="Enter the complete postal or physical address of the host company."
              value={form.companyAddress}
              onChange={(value) => set("companyAddress", value)}
            />
            <Select
              label="Suggested Company for Internship"
              instruction="Select your preferred company placement from the partner list."
              value={form.suggestedCompany}
              onChange={(value) => set("suggestedCompany", value)}
              options={partnerCompanies}
            />
            <div>
              <label htmlFor={resumeInputId} className="text-sm font-semibold">
                Upload CV (optional)
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, or DOCX, up to 10 MB.
              </p>
              <input
                id={resumeInputId}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="mt-3 block w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  event.currentTarget.value = "";
                  attachCv(file);
                }}
              />
              {documents.length > 0 && <label className="mt-2 grid gap-1 text-xs font-medium">Use a document from your profile
                <select value="" className="min-h-10 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-sm" disabled={cvBusy}
                  onChange={event => void attachStoredCv(event.target.value)}>
                  <option value="">Choose a document</option>{documents.map(item => <option key={item.id} value={item.id}>{item.filename}</option>)}
                </select>
              </label>}
              {resume ? (
                <p className="text-xs text-emerald-700 mt-2">
                  Selected: {resume.name}{" "}
                  {resume.name.toLowerCase().endsWith(".pdf") && (
                    <button type="button" className="ml-2 underline" onClick={() => void previewPdf(() => Promise.resolve(resume)).catch(failure =>
                      setError(failure instanceof Error ? failure.message : "Unable to open the PDF."))}>Preview CV</button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setResume(null); setError(""); }}
                    className="underline ml-2"
                  >
                    Remove
                  </button>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  Not uploaded
                </p>
              )}
            </div>
          </Section>
          <Section title="Payment & Submission">
            <p className="text-sm font-semibold">
              One-time application fee: GH₵4
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Paid on submission
            </p>
            {programId && <button type="button" onClick={() => void saveDraft()} disabled={draftBusy || loading}
              className="mt-2 min-h-10 rounded-lg border border-border px-3 text-xs font-semibold">{draftBusy ? "Saving…" : "Save draft"}</button>}
            {draftNotice && <p className="mt-2 text-xs text-muted-foreground" role="status">{draftNotice}</p>}
            {error && (
              <p className="text-sm text-red-600 mt-3" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || photoBusy || draftBusy || cvBusy}
              className="w-full mt-5 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-60"
            >
              {loading
                ? "Processing submission…"
                : retryPayment ? "Resume paid submission" : "Pay and Submit · GH₵4 →"}
            </button>
          </Section>
        </form>
      </div>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-base font-bold text-primary border-b border-border pb-1.5 mb-2">
        {title}
      </h3>
      <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function Field({
  label,
  instruction,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  instruction?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {instruction && (
        <span className="block text-xs text-muted-foreground mt-1">
          {instruction}
        </span>
      )}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        className="mt-2 w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2"
      />
    </label>
  );
}
function Select({
  label,
  instruction,
  value,
  onChange,
  options,
}: {
  label: string;
  instruction?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {instruction && (
        <span className="block text-xs text-muted-foreground mt-1">
          {instruction}
        </span>
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm"
      >
        <option value="">— Select —</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
