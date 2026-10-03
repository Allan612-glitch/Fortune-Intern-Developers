import { useState } from "react";
import {
  printApplicationLetter,
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
  onClose: () => void;
  onViewApplications?: () => void;
  onBackDashboard?: () => void;
}
export default function ApplyFormModal({
  prefilledCompany = "",
  prefilledRole = "",
  programId,
  ownerEmail = "",
  onClose,
  onViewApplications,
  onBackDashboard,
}: Props) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState("");
  const [submittedApplication, setSubmittedApplication] =
    useState<ApplicationRecord | null>(null);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
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
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const required: Array<keyof typeof form> = [
      "firstName",
      "lastName",
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
    if (form.institution === "Other" && !form.otherInstitution.trim())
      return "Please specify your institution.";
    if (!/^0\d{9}$/.test(form.phone))
      return "Enter a valid Ghanaian phone number using 10 digits.";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return "Please enter a valid email address.";
    if (!/^\d{7,8}$/.test(form.indexNumber.trim()))
      return "Enter a valid 7- or 8-digit index number.";
    if (!resume) return "Please upload your CV or Resume before continuing.";
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
    payload.append("gender", form.gender);
    payload.append("student_index_number", form.indexNumber.trim());
    payload.append("year_of_study", form.year);
    payload.append("suggested_company", form.suggestedCompany);
    try {
      const result = await submitApplication(payload);
      const application = {
        ...fromBackendApplication(result, ownerEmail || form.email.trim().toLowerCase()),
        company: form.companyName,
        companyAddress: form.companyAddress,
        applicantName: `${form.firstName} ${form.lastName}`.trim(),
        applicantEmail: form.email,
        studentIndexNumber: form.indexNumber.trim(),
        paymentStatus: paymentReference.startsWith("FIN-DEMO")
          ? "Payment Pending" as const
          : "Payment Successful" as const,
        paymentReference,
        applicationDate: now,
        lastUpdated: now,
        applicationLetterAvailable: false,
        details: { personalInformation: form },
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
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setLoading(true);
    const win = window as PaystackWindow;
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (publicKey && (await loadPaystack()) && win.PaystackPop) {
      win.PaystackPop.setup({
        key: publicKey,
        email: form.email,
        amount: 400,
        currency: "GHS",
        ref: `FIN-${Date.now()}`,
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
          void complete(response.reference);
        },
        onClose: () => setLoading(false),
      }).openIframe();
      return;
    }
    void complete(`FIN-DEMO-${Date.now().toString().slice(-6)}`);
  };
  const letter = () => {
    if (submittedApplication) printApplicationLetter(submittedApplication);
  };
  if (step === "success")
    return (
      <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
        <div className="bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">
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
            Your internship application has been submitted successfully.
          </p>
          <p className="text-sm font-semibold text-amber-700 mt-3">
            {submittedApplication?.paymentStatus === "Payment Successful"
              ? "Paystack returned a successful payment result."
              : "Payment was not confirmed; the application was submitted in demo mode."}
          </p>
          <div className="bg-secondary rounded-xl p-4 mt-5 text-left space-y-2 text-sm">
            <p>Opportunity: {prefilledRole || "Internship Application"}</p>
            <p>Reference: {reference}</p>
            <p>Submission date: {new Date().toLocaleDateString()}</p>
            <p>Application status: Submitted</p>
            <p>Payment status: {submittedApplication?.paymentStatus}</p>
          </div>
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
            onClick={letter}
            className="w-full mt-5 py-3 rounded-xl bg-accent text-primary font-bold"
          >
            Print Application
          </button>
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
    <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-primary text-white px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl">
              Internship / Attachment Application Form
            </h2>
            <p className="text-white/70 text-xs mt-1">
              Fill in your details then pay to submit. Fields marked * are
              required.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close application form"
            className="text-xl"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-7">
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
            <div>
              <span className="text-sm font-semibold">Gender *</span>
              <p className="text-xs text-muted-foreground mt-1">
                Select your gender.
              </p>
              <div className="flex gap-5 mt-3">
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
              <label className="text-sm font-semibold">
                Upload Resume / CV *
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Upload your CV from your computer or phone. PDF, DOC, and DOCX
                are supported.
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="mt-3 block w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const types = [
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  ];
                  if (!types.includes(file.type)) {
                    setError("Please upload a PDF, DOC, or DOCX file.");
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setError("Your document must be smaller than 5MB.");
                    return;
                  }
                  setResume(file);
                  setError("");
                }}
              />
              {resume ? (
                <p className="text-xs text-emerald-700 mt-2">
                  Uploaded: {resume.name}{" "}
                  <button
                    type="button"
                    onClick={() => setResume(null)}
                    className="underline ml-2"
                  >
                    Remove / replace
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
            {error && (
              <p className="text-sm text-red-600 mt-3" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-60"
            >
              {loading
                ? "Opening secure payment..."
                : "Pay and Submit · GH₵4 →"}
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
      <h3 className="text-base font-bold text-primary border-b border-border pb-2 mb-4">
        {title}
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
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
