import BottomNav from "@/components/layout/BottomNav";

  const WhatWeDo = [
    {title: "Internship Placement",  info: "We match students to roles aligned with their course of study across our partner network in banking, telecoms, energy, health, insurance, construction and consumer goods."},
    {title: "Official Documentation", info: "We issue verified internship letters, supervisor assessment forms and certificates of completion, each carrying a unique reference for authentication."},
    {title: "FIN Academy", info: "Skills tracks in software engineering, data analytics, marketing strategy and leadership development."},
    {title: "Student Support", info: "The Super AI assistant, application tracking and responsive customer service."}
  ]

export default function About() {

  return (

            <div className="text-center justify-center min-h-screen flex flex-col items-center px-4">
              <h1 className="text-3xl font-bold mb-4">About Fortune Intern Network</h1>

              <p>
                 <span className="font-bold">Fortune Intern Network (FIN)</span> is a Ghanaian student development organisation bridging tertiary education and the world of work. We connect students with opportunities that matter.
              </p>

              <div>
                {WhatWeDo.map((item,index) => (
                  <ul key={index} className="">
                    <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                    <li>{item.info}</li>
                  </ul>
                ))}
              </div>


            </div>
            
  );
}
