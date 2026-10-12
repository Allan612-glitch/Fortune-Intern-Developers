export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col pt-12 pb-24 px-4 sm:px-8 md:px-16 lg:px-32">
      <div className="max-w-4xl w-full mx-auto text-slate-700">

        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-[#0B172A] mb-4">
            Refund Policy
          </h1>
          <hr className="border-t-[3px] border-yellow-500 w-full" />
        </div>

        <p className="text-lg leading-relaxed mb-10">
          The processing fee covers verification, document generation and placement administration. It is not refundable once processing begins, except in the cases below.
        </p>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">1. When We Refund</h2>
          <ul className="list-disc pl-6 space-y-3 text-lg leading-relaxed">
            <li>Duplicate payment for the same application reference.</li>
            <li>A debited transaction that Paystack did not verify as successful.</li>
            <li>A system fault that prevented creation of your application record despite successful payment.</li>
            <li>Cancellation of a programme or cycle by FIN before your application was processed.</li>
          </ul>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">2. When Refunds Are Not Available</h2>
          <ul className="list-disc pl-6 space-y-3 text-lg leading-relaxed">
            <li>Change of mind after processing has begun or documents have issued.</li>
            <li>Disqualification or termination for false information or breach of the <a href="/terms" className="text-blue-600 underline">Terms and Conditions</a>.</li>
            <li>Where a host organisation does not select you, since selection decisions are theirs alone.</li>
          </ul>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">3. How to Request a Refund</h2>
          <p className="text-lg leading-relaxed">
            Email{" "}
            <a href="mailto:fortuneintern.gh@gmail.com" className="text-blue-600 underline">fortuneintern.gh@gmail.com</a>{" "}
            with the subject "Refund Request" followed by your Paystack reference, within 14 days of payment. Verification with Paystack takes up to five working days. Approved refunds return to the original payment channel within 7 to 14 working days. Cash refunds are not available.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">4. Statutory Rights</h2>
          <p className="text-lg leading-relaxed">
            Nothing in this policy limits your rights under Ghanaian consumer protection law or the Electronic Transactions Act, 2008 (Act 772).
          </p>
        </div>

        <span className="text-gray-500">Last updated: September 2026</span>

      </div>
    </div>
  );
}
