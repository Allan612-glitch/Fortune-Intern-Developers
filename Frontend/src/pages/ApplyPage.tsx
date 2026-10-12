import { useState } from "react";
import type { AppUser } from "../App";
import ApplyFormModal from "../components/ApplyFormModal";
import ApplicationsPage from "./ApplicationsPage";

export default function ApplyPage({ user }: { user: AppUser }) {
  const [showModal, setShowModal] = useState(false);
  const [section, setSection] = useState<"apply" | "applications">("apply");

  if (section === "applications") {
    return (
      <div>
        <div className="px-4 pt-4 lg:px-6 lg:pt-6 max-w-6xl mx-auto">
          <button
            onClick={() => setSection("apply")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Apply for an Internship
          </button>
        </div>
        <ApplicationsPage email={user.email} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Apply for an Internship
        </h1>
        <p className="text-sm text-muted-foreground">
          Fill out one form — we&apos;ll contact the company on your behalf.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setSection("apply")}
          className="text-left bg-primary text-white rounded-2xl p-5 shadow-sm"
        >
          <p className="font-semibold text-sm">Apply for an Internship</p>
          <p className="text-xs text-white/70 mt-1">
            Complete a new application and pay securely.
          </p>
        </button>
        <button
          onClick={() => setSection("applications")}
          className="text-left bg-white border border-border rounded-2xl p-5 shadow-sm hover:bg-secondary"
        >
          <p className="font-semibold text-sm text-primary">My Applications</p>
          <p className="text-xs text-muted-foreground mt-1">
            Track your submitted applications and status.
          </p>
        </button>
      </div>

      {/* How it works */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-base mb-4">
          How the application process works
        </h2>
        <div className="space-y-4">
          {[
            {
              step: "01",
              title: "Fill in your details",
              desc: "Complete the form with your personal info, university, and the company you're applying to. Company name is auto-searched.",
            },
            {
              step: "02",
              title: "Upload one document",
              desc: "Upload either your Resume or CV, then review your application details.",
            },
            {
              step: "03",
              title: "Pay securely with Paystack",
              desc: "Pay the GH₵4 application fee using mobile money, card, USSD, or bank transfer.",
            },
            {
              step: "04",
              title: "Submit and download",
              desc: "After payment, receive your application reference and download your application letter.",
            },
            {
              step: "05",
              title: "Track your application",
              desc: "Monitor your application and payment status from your Dashboard.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #F5B731, #d9a020)",
                  color: "#1a1f3a",
                }}
              >
                {item.step}
              </div>
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="w-full py-4 rounded-2xl text-white text-base font-bold hover:opacity-90 transition-opacity shadow-lg"
        style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
      >
        Start Application Form →
      </button>

      {showModal && (
        <ApplyFormModal
          ownerEmail={user.email}
          onClose={() => setShowModal(false)}
          onViewApplications={() => setSection("applications")}
          onBackDashboard={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
