export default function Terms() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col pt-12 pb-24 px-4 sm:px-8 md:px-16 lg:px-32">
      <div className="max-w-4xl w-full mx-auto text-slate-700">

        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-[#0B172A] mb-4">
            Terms and Conditions
          </h1>
          <hr className="border-t-[3px] border-yellow-500 w-full" />
        </div>

        <p className="text-lg leading-relaxed mb-10">
          By using the FIN portal you accept these terms. If you do not agree, please discontinue use.
        </p>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">1. Eligibility</h2>
          <p className="text-lg leading-relaxed">
            The portal serves registered students of recognised tertiary institutions in Ghana and approved partner organisations.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">2. Accurate Information</h2>
          <p className="text-lg leading-relaxed">
            Provide truthful information at registration, application and assessment. Falsification leads to disqualification, withdrawal of issued documents and account termination.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">3. Applications, Fees and Refunds</h2>
          <p className="text-lg leading-relaxed">
            Submission requires the single processing fee shown at checkout, paid through Paystack. Official documents are released only after verified payment. The processing fee covers verification, document generation and placement administration. It is not refundable once processing begins, except as described below.
          </p>
          <h3 id="refunds" className="text-xl font-bold text-[#0B172A] mt-6 mb-3">Refund eligibility</h3>
          <p className="text-lg leading-relaxed mb-3">We issue refunds for:</p>
          <ul className="list-disc pl-6 space-y-3 text-lg leading-relaxed">
            <li>Duplicate payment for the same application reference.</li>
            <li>A debited transaction that Paystack did not verify as successful.</li>
            <li>A system fault that prevented creation of your application record despite successful payment.</li>
            <li>Cancellation of a programme or cycle by FIN before your application was processed.</li>
          </ul>
          <h3 className="text-xl font-bold text-[#0B172A] mt-6 mb-3">When refunds are not available</h3>
          <ul className="list-disc pl-6 space-y-3 text-lg leading-relaxed">
            <li>Change of mind after processing has begun or documents have issued.</li>
            <li>Disqualification or termination for false information or breach of these Terms and Conditions.</li>
            <li>Where a host organisation does not select you, since selection decisions are theirs alone.</li>
          </ul>
          <h3 className="text-xl font-bold text-[#0B172A] mt-6 mb-3">How to request a refund</h3>
          <p className="text-lg leading-relaxed">
            Email{" "}
            <a href="mailto:fortuneintern.gh@gmail.com" className="text-blue-600 underline">fortuneintern.gh@gmail.com</a>{" "}
            with the subject &quot;Refund Request&quot; followed by your Paystack reference, within 14 days of payment. Verification with Paystack takes up to five working days. Approved refunds return to the original payment channel within 7 to 14 working days. Cash refunds are not available.
          </p>
          <h3 className="text-xl font-bold text-[#0B172A] mt-6 mb-3">Statutory rights</h3>
          <p className="text-lg leading-relaxed">
            Nothing in this refund policy limits your rights under Ghanaian consumer protection law or the Electronic Transactions Act, 2008 (Act 772).
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">4. Official Documents</h2>
          <p className="text-lg leading-relaxed">
            Letters, assessment forms and certificates are for authorised internship use only and carry a unique reference verifiable with FIN. Alteration or forgery is prohibited and may be reported under the Cybersecurity and Cybercrime Act, 2020 (Act 1038).
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">5. Intellectual Property</h2>
          <p className="text-lg leading-relaxed">
            The FIN logo, brand names, portal content, document templates and the Super AI knowledge base belong to Fortune Intern Network. Reproduction or redistribution requires written permission.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">6. Acceptable Use</h2>
          <p className="text-lg leading-relaxed">
            You agree not to attempt unauthorised access, distribute malware, send spam or disrupt other users. We may suspend accounts that breach these terms.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">7. Third Party Services</h2>
          <p className="text-lg leading-relaxed">
            Payments are governed by the terms of Paystack. External links are provided for convenience and we are not responsible for their content or practices.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">8. No Guarantee of Placement</h2>
          <p className="text-lg leading-relaxed">
            FIN facilitates introductions and documentation. Selection decisions rest solely with host organisations and payment of the processing fee does not guarantee placement.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">9. Limitation of Liability</h2>
          <p className="text-lg leading-relaxed">
            To the maximum extent permitted by Ghanaian law, our total liability arising from use of the portal is limited to fees paid by you in the preceding twelve months. We are not liable for indirect or consequential losses.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">10. Governing Law</h2>
          <p className="text-lg leading-relaxed">
            These terms are governed by the laws of the Republic of Ghana. Disputes are first negotiated in good faith and thereafter submitted to the courts of Accra.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">11. Changes and Contact</h2>
          <p className="text-lg leading-relaxed">
            Continued use after publication of revised terms constitutes acceptance. Contact details are stated in the <a href="/privacy-policy" className="text-blue-600 underline">Privacy Policy</a>.
          </p>
        </div>

        <span className="text-gray-500">Last updated: September 2026</span>

      </div>
    </div>
  );
}
