import BottomNav from "@/components/layout/BottomNav";

const WhatWeDo = [
  {title: "Internship placement", info: "We match students to roles aligned with their course of study across our partner network in banking, telecoms, energy, health, insurance, construction and consumer goods."},
  {title: "Official documentation", info: "We issue verified internship letters, supervisor assessment forms and certificates of completion, each carrying a unique reference for authentication."},
  {title: "FIN Academy", info: "Skills tracks in software engineering, data analytics, marketing strategy and leadership development."},
  {title: "Student support", info: "The Super AI assistant, application tracking and responsive customer service."}
]

export default function About() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col pt-12 pb-24 px-4 sm:px-8 md:px-16 lg:px-32">
      <div className="max-w-4xl w-full mx-auto text-slate-700">
        
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-[#0B172A] mb-4">
            About Fortune Intern Network
          </h1>
          <hr className="border-t-[3px] border-yellow-500 w-full" />
        </div>

        <p className="text-lg leading-relaxed mb-10">
          <span className="font-bold text-[#0B172A]">Fortune Intern Network (FIN)</span> is a Ghanaian student development organisation bridging tertiary education and the world of work. We connect students with opportunities that matter.
        </p>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">What we do</h2>
          <ul className="list-disc pl-6 space-y-4 text-lg leading-relaxed">
            {WhatWeDo.map((item, index) => (
              <li key={index}>
                <span className="font-bold text-[#0B172A]">{item.title}.</span> {item.info}
              </li>
            ))}
          </ul>
        </div>

        
        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">Where we work</h2>
          <p className="text-lg leading-relaxed">
            We operate from Accra and Kumasi, including the FIN chapter at Kwame Nkrumah University of Science and Technology, and serve students of recognised tertiary institutions across Ghana.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold text-[#0B172A] mb-4">Our commitments</h2>
          <ul className="list-disc pl-6 space-y-4 text-lg leading-relaxed">
            <li>Transparent pricing with a single processing fee collected by a licensed payment provider.</li>
            <li>Privacy by design under the Data Protection Act, 2012 (Act 843). We collect only what each</li>
          </ul>
        </div>

            <span className="text-gray-500">Last Updated: September 2026 </span>
      
      </div>
    </div>
  );
}