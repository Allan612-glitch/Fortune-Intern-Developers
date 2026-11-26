// Content for the FAQs section on the landing page.
// Ported from the standalone FAQs.html. Only this file holds the text, so the
// owner can edit wording without touching the layout code.
//
// An answer is a list of pieces: plain text, or an object for a link / emphasis.
//   { text, to }      -> link to a page inside the app (react-router)
//   { text, href }    -> normal link (anchor on this page, mailto:, tel:, https://)
//   { text, em }      -> italic emphasis

export type FaqPiece =
  | string
  | { text: string; to?: string; href?: string; external?: boolean; em?: boolean }

export type FaqCategoryId = "start" | "pay" | "doc" | "prog" | "chap" | "conn" | "priv"

export interface FaqItem {
  cat: FaqCategoryId
  q: string
  a: FaqPiece[]
}

export const faqCategories: { id: "all" | FaqCategoryId; label: string }[] = [
  { id: "all", label: "All questions" },
  { id: "start", label: "Getting started" },
  { id: "pay", label: "Applications & payments" },
  { id: "doc", label: "Internships & documents" },
  { id: "prog", label: "Programs & events" },
  { id: "chap", label: "Chapters & leadership" },
  { id: "conn", label: "FIN CONNECT & Super AI" },
  { id: "priv", label: "Privacy & the desk" },
]

const WHATSAPP = "https://wa.me/233257038948"
const EMAIL = "mailto:fortuneintern.gh@gmail.com"

export const faqs: FaqItem[] = [
  // ---- Getting started -----------------------------------------------------
  {
    cat: "start",
    q: "What exactly is Fortune Intern Network?",
    a: [
      "FIN is a Ghanaian career ecosystem that walks students from campus to real work. We run four programs, Paid Internships, Skills Training through the FIN Academy, Recruitment with mentorship, and Entrepreneurship Training for student founders, and we back all of it with verified documents and a human desk in Accra. Our motto says it best: ",
      { text: "Bridging Dreams and Careers.", em: true },
    ],
  },
  {
    cat: "start",
    q: "Who can join FIN?",
    a: [
      "Any student at a recognized tertiary institution in Ghana, whether university, technical university, or college of education and nursing. If you are under 18 you will need guardian or institution approval, and graduates can still join specific tracks like work study and the bootcamps. When in doubt, ",
      { text: "ask the desk", href: WHATSAPP, external: true },
      " and we will point you to the right door.",
    ],
  },
  {
    cat: "start",
    q: "Does it cost anything to sign up or browse?",
    a: [
      "No. Creating your profile, browsing opportunities and reading the Career Guide are completely free. You only pay when you submit an internship application, which is a one time fee of GH₵4, or when you register for a paid event like the Data Analytics Bootcamp.",
    ],
  },
  {
    cat: "start",
    q: "How do I apply, step by step?",
    a: [
      "Sign in or create an account, open the internship you want and apply. Fill in your personal and academic details, give the host company's name and address (you can also suggest a partner company), upload your CV, then complete the GH₵4 payment through Paystack. Your file enters the recruitment pipeline immediately and you can track it on your dashboard through Applied, Review, Interview and Offer.",
    ],
  },

  // ---- Applications & payments --------------------------------------------
  {
    cat: "pay",
    q: "How much is the application fee and how do I pay it?",
    a: [
      "The fee is a one time charge of GH₵4, paid securely through Paystack with card or mobile money. Your card details never touch our servers, and the fee covers verification, document generation and administration for your file.",
    ],
  },
  {
    cat: "pay",
    q: "I paid but my status still shows unpaid. What now?",
    a: [
      "First give it five minutes and refresh, because bank confirmations can lag. If it is still stuck after 30 minutes, message the desk on ",
      { text: "WhatsApp", href: WHATSAPP, external: true },
      " with your Paystack reference and we will verify the transaction manually, usually the same day.",
    ],
  },
  {
    cat: "pay",
    q: "Can I get a refund?",
    a: [
      "Yes, in fair cases: duplicate payment, a debited transaction that did not verify, a system fault that lost your application, or FIN cancelling a cycle. Send your Paystack reference to ",
      { text: "fortuneintern.gh@gmail.com", href: EMAIL },
      " within 14 days and approved refunds return to the original channel in 7 to 14 working days. Change of mind after processing and non selection by a company are not refundable, and the full rules live in the ",
      { text: "Refund Policy", to: "/terms#refunds" },
      ".",
    ],
  },
  {
    cat: "pay",
    q: "Why does FIN charge a fee at all?",
    a: [
      "Because humans read every application and every document is verified before it carries our seal. The small fee keeps that quality honest, funds the desk that answers you, and lets us keep trainings, the Academy and most events free.",
    ],
  },
  {
    cat: "pay",
    q: "What happens after I submit my application?",
    a: [
      "A person reads it, then blind screening scores it fairly. We promise an answer within 72 hours, even when the answer is no. Strong files move to a short paid work sample and a 30 minute conversation with the real team, then placement with mentorship attached.",
    ],
  },

  // ---- Internships & documents --------------------------------------------
  {
    cat: "doc",
    q: "When and how do I get my internship letter?",
    a: [
      "Once FIN accepts your application, your official recommendation letter is emailed to you. Print it and take it with your CV to the HR office of the company you chose. Every letter carries a unique reference and the signature of our Managing Director.",
    ],
  },
  {
    cat: "doc",
    q: "How does an employer verify my letter or certificate?",
    a: [
      "They can check the reference number on the ",
      { text: "letter verification page", to: "/verify-letter" },
      ", or simply quote it to the desk by ",
      { text: "email", href: EMAIL },
      " or ",
      { text: "WhatsApp", href: WHATSAPP, external: true },
      " and we confirm it on the spot. At application time we also send an official endorsement email to the organization, so your credentials arrive pre validated.",
    ],
  },
  {
    cat: "doc",
    q: "What is the assessment form and who fills it?",
    a: [
      "It is the supervisor side of your story. At the end of your placement your supervisor rates ten criteria from punctuality to overall performance, writes comments and picks a recommendation, then signs and stamps the form. FIN emails you the form during your placement so you can hand it to your supervisor.",
    ],
  },
  {
    cat: "doc",
    q: "When do I receive my certificate?",
    a: [
      "Your Certificate of Completion is sent to your email after you complete your internship and your supervisor returns the assessment form with a positive recommendation. It carries its own certificate number you can share on LinkedIn with pride.",
    ],
  },
  {
    cat: "doc",
    q: "Can FIN guarantee me a placement?",
    a: [
      "Honestly, no one can, and we will not pretend. What we guarantee is preparation, verification and a real introduction. Our target is at least 70 percent placement for eligible members each cycle, and the final yes always rests with the host organization.",
    ],
  },
  {
    cat: "doc",
    q: "What is work study and can I do it during semester?",
    a: [
      "Yes, that is the point. Work study places you in flexible roles like tutoring, event logistics, departmental support and insurance sales, with shifts built around your timetable so you earn without sacrificing your grades.",
    ],
  },
  {
    cat: "doc",
    q: "Does FIN help with National Service?",
    a: [
      "We do. Graduating members get placement advisory and priority onboarding assistance, so your service year starts with direction instead of guesswork.",
    ],
  },

  // ---- Programs & events ---------------------------------------------------
  {
    cat: "prog",
    q: "What programs does FIN actually run?",
    a: [
      "Four at the core: Paid Internships that place you in real companies for real pay, Skills Training through the FIN Academy, Recruitment that manages your pipeline with mentorship attached, and Entrepreneurship Training that works as an incubator for student founders. Around them sit events like the Career Summit and the speaking masterclass.",
    ],
  },
  {
    cat: "prog",
    q: "Which programs are free and which ones cost money?",
    a: [
      "Free: Public Speaking Training, Networking Seminar, the Reading and Critical Thinking Conference, and Academy courses for applicants. Paid: Graphic Design Seminar at GHS 30, Data Analytics Bootcamp at GHS 80, Software Development Bootcamp at GHS 100 and the FIN Career Summit at GHS 50. Every price is shown before you register, never after.",
    ],
  },
  {
    cat: "prog",
    q: "How do I register for an event like the Career Summit?",
    a: [
      "Open ",
      { text: "FIN CONNECT", href: "#fin-connect" },
      " on this page, choose Programs and Events, pick your event or program and press Register. That opens a WhatsApp message to the FIN desk with the program name and fee already filled in. Send it and the desk replies on WhatsApp; free events are confirmed within 72 hours.",
    ],
  },
  {
    cat: "prog",
    q: "What happens at Public Speaking Training?",
    a: [
      "Every three weeks you drill speeches, elevator pitches and debate rounds with your chapter, and once a year the best speakers meet at the Chapter Pitch Competition, with winners advancing to the FIN National Summit. The target is an 85 percent pass rate on patron assessed presentations, so the feedback is real and kind.",
    ],
  },
  {
    cat: "prog",
    q: "What is the FIN Academy and do I get certified?",
    a: [
      "The Academy is our skills school: short practical courses in design, data, software, communication and AI productivity, free for applicants. Finish a course and you get a certificate; finish the one month project track and you leave with a verified portfolio, a proper CV and a complete LinkedIn profile.",
    ],
  },
  {
    cat: "prog",
    q: "What is the FIN Developer Lab and how do I join?",
    a: [
      "It is the engineering chamber of the Academy, building productive, efficient and scalable digital solutions, including this very website ecosystem. Apply through ",
      { text: "FIN CONNECT", href: "#fin-connect" },
      ", and if shortlisted you complete a paid work sample within seven days before onboarding to a squad with a mentor and a shipped project per cycle.",
    ],
  },

  // ---- Chapters & leadership ----------------------------------------------
  {
    cat: "chap",
    q: "How many chapters exist and is my campus covered?",
    a: [
      "Fifteen chapters are active today and we are expanding toward all 41 tertiary institutions on our directory. Browse the live boards on the ",
      { text: "Chapters page", to: "/chapters" },
      " (sign in to view it); if your campus is not open yet, message the desk and we will add you to the launch list.",
    ],
  },
  {
    cat: "chap",
    q: "How do I become an executive or start a chapter?",
    a: [
      "Every chapter runs an eleven seat board from Campus Ambassador to Chapter Patron, appointed or elected under the constitution. To start one, gather interested students, contact the desk for ratification, secure a faculty patron and follow the launch checklist in the blueprint. Executives report monthly and get full corporate backing.",
    ],
  },
  {
    cat: "chap",
    q: "Where can I read the official rules and procedures?",
    a: [
      "In the Campus Chapter Blueprint and SOP, downloadable as PDF or PowerPoint from the ",
      { text: "Chapters page", to: "/chapters" },
      ". It covers the annual calendar, the three program pillars, communication tiers and the six standard operating procedures, including the report deadline on the fifth of every month.",
    ],
  },
  {
    cat: "chap",
    q: "Who leads my chapter and how do I reach them?",
    a: [
      "Your executive board is published in the directory with roles, photos and contacts as chapters populate them. For day to day matters start with the General Secretary or Chapter President; for anything constitutional, the Patron or the corporate desk.",
    ],
  },

  // ---- FIN CONNECT & Super AI ---------------------------------------------
  {
    cat: "conn",
    q: "What is FIN CONNECT on the homepage?",
    a: [
      "It is the front door of the ecosystem: four cards for Programs and Events, the Career Guide, the Developer Lab and our Partners. Each card opens a window with full details and downloads, and registration goes straight to the FIN desk on WhatsApp, all without leaving the page.",
    ],
  },
  {
    cat: "conn",
    q: "What is inside the Career Guide and can I download it?",
    a: [
      "A seven module curriculum built on contemporary courses from Coursera, DataCamp, LinkedIn Learning and friends, with labs, graded assignments and reflection questions per module. Download it as a text file from the Guide window; chapters use it for teaching and students use it for self study.",
    ],
  },
  {
    cat: "conn",
    q: "What can Super AI do?",
    a: [
      "Once you are signed in, Super answers questions about FIN: programs, fees, documents, chapters and contacts. It also builds your KNUST format CV and cover letter in a guided chat.",
    ],
  },
  {
    cat: "conn",
    q: "Will Super AI write my CV for me?",
    a: [
      "It will build it with you, which is better. Five quick questions produce a KNUST format CV with honest placeholders in gold brackets that you fill yourself, plus a cover letter under 250 words. Copy the text or download it, then polish it with a human friend.",
    ],
  },

  // ---- Privacy & the desk --------------------------------------------------
  {
    cat: "priv",
    q: "How is my personal data protected?",
    a: [
      "Under Ghana's Data Protection Act 2012, Act 843, and for EEA and UK users, the GDPR. We collect only what each service needs, we never store card details, we never sell data, and we share your profile only with companies you apply to. The full story is in the ",
      { text: "Privacy Policy", to: "/privacy-policy" },
      ".",
    ],
  },
  {
    cat: "priv",
    q: "How do I delete my account?",
    a: [
      "Email ",
      { text: "fortuneintern.gh@gmail.com", href: EMAIL },
      " with the subject Account Deletion Request. We verify it is you and complete deletion within 30 days. Records tied to your account, including your applications, are deleted with it, so download your letters and certificates first. Payment records are held by Paystack under its own rules.",
    ],
  },
  {
    cat: "priv",
    q: "How fast does the desk reply, and through which channel?",
    a: [
      "On ",
      { text: "WhatsApp", href: WHATSAPP, external: true },
      " and ",
      { text: "phone", href: "tel:+233200313672" },
      " a human answers Monday to Friday, 9:00 to 17:00 GMT. Email gets a reply within 72 hours, and that promise includes saying no clearly. Pick whichever channel suits you below.",
    ],
  },
]

export function faqPlainText(item: FaqItem) {
  return `${item.q} ${item.a.map((piece) => (typeof piece === "string" ? piece : piece.text)).join("")}`
}
