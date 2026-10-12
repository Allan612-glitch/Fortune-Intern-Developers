export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col pt-12 pb-24 px-4 sm:px-8 md:px-16 lg:px-32">
      <div className="max-w-4xl w-full mx-auto text-slate-700">

        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-[#0B172A] mb-4">
            Cookie Policy
          </h1>
          <hr className="border-t-[3px] border-yellow-500 w-full" />
        </div>

        <p className="text-lg leading-relaxed mb-10">
          This policy explains how <span className="font-bold text-[#0B172A]">Fortune Intern Network</span> uses cookies and similar technologies, including browser local storage, on our portal.
        </p>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">1. What We Use and Why</h2>
          <ul className="list-disc pl-6 space-y-4 text-lg leading-relaxed">
            <li>
              <span className="font-bold text-[#0B172A]">Necessary, no consent required:</span> session and login storage, saved document fields and your consent record. The portal cannot function without these.
            </li>
            <li>
              <span className="font-bold text-[#0B172A]">On device functionality:</span> the Super AI knowledge base and, if you provide one, your OpenAI key remain on your device and are never uploaded.
            </li>
            <li>
              <span className="font-bold text-[#0B172A]">Analytics and marketing:</span> none at present. If introduced, they load only after you accept and this policy is updated.
            </li>
          </ul>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">2. Third Party Services</h2>
          <ul className="list-disc pl-6 space-y-3 text-lg leading-relaxed">
            <li>Paystack sets checkout cookies on its own domain during payment.</li>
            <li>Google Fonts and content delivery networks receive your IP address when assets load but set no cookies.</li>
            <li>Social platforms are involved only when you click through to them.</li>
          </ul>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">3. Your Choices</h2>
          <p className="text-lg leading-relaxed">
            The banner offers &quot;Accept all cookies&quot; or &quot;Reject all cookies&quot;. Rejecting keeps only the necessary storage active, which is the safe default. You may change your choice at any time by clearing site data in your browser or asking us to reset your consent record. Blocking necessary storage signs you out and removes saved progress.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">4. Contact</h2>
          <p className="text-lg leading-relaxed">
            Questions:{" "}
            <a href="mailto:fortuneintern.gh@gmail.com" className="text-blue-600 underline">fortuneintern.gh@gmail.com</a>,{" "}
            <a href="tel:+233200313672" className="text-blue-600 underline">+233 20 031 3672</a> or{" "}
            <a href="tel:+233257038948" className="text-blue-600 underline">+233 25 703 8948</a>.
          </p>
        </div>

        <span className="text-gray-500">Last updated: September 2026</span>

      </div>
    </div>
  );
}
