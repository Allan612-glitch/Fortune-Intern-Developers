// Content for the FIN CONNECT section on the landing page.
// Ported from the standalone FINConnect.html. Only this file holds the text,
// so the owner can edit wording without touching the layout code.

export const DESK_WHATSAPP = "https://wa.me/233257038948"

/** Opens WhatsApp with a ready-made message to the FIN desk. */
export function deskLink(message: string) {
  return `${DESK_WHATSAPP}?text=${encodeURIComponent(message)}`
}

export type FinAreaId = "programs" | "guide" | "lab" | "partners"

export const partners = [
  "AngloGold Ashanti",
  "AT Ghana",
  "Coca-Cola Bottling Company of Ghana",
  "Consolidated Bank Ghana (CBG)",
  "Consar Limited",
  "Ecobank Ghana",
  "Enterprise Group",
  "Ernest Chemists Limited",
  "Fidelity Bank Ghana",
  "GCB Bank PLC",
  "Ghana Grid Company (GRIDCo)",
  "GLICO General Insurance",
  "Guinness Ghana Breweries",
  "Hollard Insurance Ghana",
  "Joshob Construction Company",
  "Komfo Anokye Teaching Hospital",
  "Korle-Bu Teaching Hospital",
  "McDan Group",
  "Micheletti & Co.",
  "MTN Ghana",
  "Nestlé Ghana",
  "Phoenix Insurance Company",
  "RNAQ Holdings",
  "SIC Insurance PLC",
  "Stanbic Bank Ghana",
  "Star Assurance Company",
  "Telecel Ghana",
  "Tema Oil Refinery (TOR)",
  "Tobinco Pharmaceuticals",
  "Tullow Oil Ghana",
  "Unilever Ghana",
  "UTV (United Television)",
  "Vanguard Assurance Company",
  "Volta River Authority (VRA)",
]

export interface FinDoorway {
  id: FinAreaId
  title: string
  description: string
  meta: string
  cta: string
  /** Optional photo (import it from src/assets and put it here). */
  image?: string
}

export const finDoorways: FinDoorway[] = [
  {
    id: "programs",
    title: "Programs & Events",
    description:
      "Seven flagship programs with lectures and career paths, plus a live calendar of summits, bootcamps and seminars.",
    meta: "7 programs · Free & paid · Register with the desk",
    cta: "Explore programs",
  },
  {
    id: "guide",
    title: "Career Guide",
    description:
      "A seven module contemporary curriculum with course infographics, labs, graded assignments and reflection questions.",
    meta: "7 modules · Labs & assignments · Downloadable",
    cta: "Read the guide",
  },
  {
    id: "lab",
    title: "FIN Developer Lab",
    description:
      "Software, data, ML and AI chamber of the FIN Academy. We build productive, efficient and scalable digital solutions.",
    meta: "5 tracks · Semester cohorts · Apply now",
    cta: "Join the Lab",
  },
  {
    id: "partners",
    title: "FIN Partners",
    description:
      "Explore the organizations Fortune Intern Network has partnered with across banking, telecoms, energy, health and media.",
    meta: `${partners.length} organisations · Openings each cycle`,
    cta: "View partners",
  },
]

export interface FinProgram {
  id: string
  title: string
  fee: number
  tag: string
  lecture: string
  jobs: string[]
  people: string[]
  demand: string
}

export const programs: FinProgram[] = [
  {
    id: "ps",
    title: "Public Speaking Training",
    fee: 0,
    tag: "Free · Every 3 weeks",
    lecture:
      "Structured over the blueprint three week masterclass cycle, this training builds confidence, organized thinking and persuasive delivery through speech drills, elevator pitches and inter departmental debate rounds. Speakers learn to open strong, evidence claims, handle questions and close with a call to action, the exact behaviours assessed at the eighty five percent pass rate evaluations by patrons and guest assessors.",
    jobs: [
      "Corporate Trainer & Facilitator",
      "Sales & Business Development Executive",
      "PR / Communications Officer",
      "Broadcast Journalist & Presenter",
      "Consultant & Policy Advocate",
      "Event Host / MC",
    ],
    people: [
      "Kwame Nkrumah, whose oratory mobilised a nation to independence",
      "Barack Obama, whose community organising speeches built a presidential career",
      "Winston Churchill, whose wartime broadcasts shaped public resolve",
    ],
    demand:
      "The WEF Future of Jobs Report 2025 lists leadership and social influence among the fastest growing core skills; LinkedIn learning data ranks communication among the top soft skills employers screen for.",
  },
  {
    id: "rc",
    title: "Reading & Critical Thinking Conference",
    fee: 0,
    tag: "Free · Annual conference",
    lecture:
      "A conference format intensive on comprehension, argument analysis and evidence based judgement. Delegates practise dissecting case studies, spotting logical fallacies, synthesising sources and writing clear position papers, habits that transfer directly to exams, research and boardroom decisions.",
    jobs: [
      "Research Analyst",
      "Journalist / Editor",
      "Policy Analyst",
      "Legal Associate",
      "Academic & Lecturer",
      "Strategy Associate",
    ],
    people: [
      "Wole Soyinka, Nobel laureate whose career is built on critical reading and writing",
      "Chimamanda Ngozi Adichie, whose essay craft grows from disciplined reading",
      "Warren Buffett, who attributes his edge to reading 500 pages daily",
    ],
    demand:
      "Analytical and critical thinking rank among the top core skills in the WEF Future of Jobs 2025; every knowledge economy role now screens for structured reasoning.",
  },
  {
    id: "gd",
    title: "Graphic Design Seminar",
    fee: 30,
    tag: "GHS 30 · One month project",
    lecture:
      "Hands on seminar covering branding principles, Adobe Photoshop and Canva workflows, typography, colour theory and print production. Participants leave with a verified portfolio piece, the blueprint one month skills project standard, and learn to translate a brief into a full visual identity.",
    jobs: [
      "Graphic Designer",
      "Brand Identity Designer",
      "Social Media Designer",
      "UI / Visual Designer",
      "Print & Production Artist",
      "Marketing Creative",
    ],
    people: [
      "Lemi Ghariokwu, the Nigerian designer whose Fela Kuti album covers became art history",
      "Rob Janoff, creator of the Apple logo",
      "Paula Scher, whose identities include Citibank and Jazz at Lincoln Center",
    ],
    demand:
      "Creative content demand grows with every digital channel; Canva and Photoshop fluency appear in most marketing and communications job specs across Ghana and Africa.",
  },
  {
    id: "sd",
    title: "Software Development Bootcamp",
    fee: 100,
    tag: "GHS 100 · Powered by FIN Developer Lab",
    lecture:
      "A build first bootcamp run with the FIN Developer Lab: programming fundamentals, version control, APIs, databases and a shipped capstone project. Students learn to decompose problems, write testable code and deploy, the lab standard of productive, efficient and scalable digital solutions.",
    jobs: [
      "Frontend / Backend / Full-stack Developer",
      "Mobile App Developer",
      "QA / Test Engineer",
      "Junior DevOps Engineer",
      "Technical Support Engineer",
      "Freelance Software Contractor",
    ],
    people: [
      "Herman Chinery-Hesse, Ghana software pioneer behind SoftTribe",
      "Olugbenga Agboola, Flutterwave founder who grew from engineer to fintech CEO",
      "Satya Nadella, who rose from software engineer to Microsoft CEO",
    ],
    demand:
      "Software talent remains among the most hired globally; WEF 2025 places technology literacy and AI collaboration in the fastest growing skill cluster.",
  },
  {
    id: "da",
    title: "Data Analytics Bootcamp",
    fee: 80,
    tag: "GHS 80 · Six week track",
    lecture:
      "From spreadsheets to insight: Excel modelling, SQL querying, Power BI dashboards and data storytelling. Participants clean real datasets, build management reports and defend conclusions, the exact workflow used by bank and telecom analytics desks.",
    jobs: [
      "Data Analyst",
      "Business Intelligence Analyst",
      "Operations / Sales Analyst",
      "Research & Monitoring Officer",
      "Reporting Analyst",
      "Data Visualization Specialist",
    ],
    people: [
      "DJ Patil, who coined the term data scientist and served as US Chief Data Scientist",
      "Strive Masiyiwa, whose telecom expansion is driven by data led decisions",
      "Analytics desks at MTN Ghana and Ecobank, where FIN fellows practise today",
    ],
    demand:
      "Analytical thinking is the number one core skill in WEF Future of Jobs 2025; data and AI literacy are the fastest growing requirements across banking, telecoms and public administration.",
  },
  {
    id: "ns",
    title: "Networking Seminar",
    fee: 0,
    tag: "Free · Quarterly",
    lecture:
      "Practical training on professional networks: weak tie outreach, mentorship requests, LinkedIn positioning, follow up etiquette and community building. Delegates leave with a ninety day networking plan and three scheduled professional conversations.",
    jobs: [
      "Business Development & Partnerships Roles",
      "Sales & Account Management",
      "Community Manager",
      "Programme Officer",
      "Any role, referrals accelerate every search",
    ],
    people: [
      "Reid Hoffman, LinkedIn founder who built a career on professional alliances",
      "Aliko Dangote, whose partnerships span African markets",
      "Tony Elumelu, whose foundation network powers 10,000+ entrepreneurs",
    ],
    demand:
      "LinkedIn research consistently shows a large majority of roles are filled through networks and referrals before public posting, so networking is a hiring channel, not a social habit.",
  },
  {
    id: "cs",
    title: "FIN Career Summit",
    fee: 50,
    tag: "GHS 50 · Annual flagship",
    lecture:
      "The network flagship gathering: employer panels, live recruitment drives, portfolio clinics, pitch stages and the National Summit qualification round. One day compresses months of outreach as students meet hiring managers, alumni and partners face to face.",
    jobs: [
      "Graduate Trainee placements",
      "Internship & attachment offers",
      "On the spot interview slots",
      "Mentorship matches",
      "Freelance & contract leads",
    ],
    people: [
      "World Economic Forum style summits that launched global careers",
      "Tony Elumelu Foundation entrepreneurship programmes",
      "Africa Youth Awards platforms that spotlight young talent",
    ],
    demand:
      "Early talent pipelines are now standard practice for employers; summit style exposure events remain the highest conversion channel between students and recruiters.",
  },
]

export const soonPrograms = [
  "AI & Productivity Clinic",
  "Insurance Sales Masterclass",
  "Study-Abroad & Scholarships Desk",
]

export type FinEventIcon = "cast" | "chart" | "pen" | "cap" | "net" | "book" | "code"

export type FinEventAction =
  | { kind: "program"; programId: string }
  | { kind: "lab" }
  | { kind: "invite" }

export interface FinEvent {
  id: string
  area: "programs" | "lab" | "partners"
  icon: FinEventIcon
  /** Day of the event as YYYY-MM-DD. Past events are hidden automatically. */
  date: string
  title: string
  location: string
  body: string
  action: FinEventAction
}

export const events: FinEvent[] = [
  {
    id: "summit-2026",
    area: "programs",
    icon: "cast",
    date: "2026-11-12",
    title: "FIN Career Summit 2026",
    location: "Accra International Conference Centre",
    body: "Three days of employer panels, live recruitment drives, portfolio clinics and the pitch stage. Two thousand delegates, forty exhibitors, one network.",
    action: { kind: "program", programId: "cs" },
  },
  {
    id: "da-cohort-4",
    area: "programs",
    icon: "chart",
    date: "2026-12-05",
    title: "Data Analytics Bootcamp · Cohort 4",
    location: "Online + FIN Hub, Accra",
    body: "Six week track from Excel to Power BI with a verified dashboard artefact at the end. Seats are limited to forty fellows.",
    action: { kind: "program", programId: "da" },
  },
  {
    id: "gd-seminar",
    area: "programs",
    icon: "pen",
    date: "2027-01-17",
    title: "Graphic Design Seminar",
    location: "KNUST Chapter, Kumasi",
    body: "One month project on branding, Photoshop and Canva. Leave with a verified portfolio piece and print production know how.",
    action: { kind: "program", programId: "gd" },
  },
  {
    id: "launchpad-finale",
    area: "programs",
    icon: "cap",
    date: "2027-02-18",
    title: "Launchpad Campus Tour Finale",
    location: "KNUST, Kumasi — Ghana",
    body: "The annual Chapter Public Speaking and Pitch Competition. Winners advance to the FIN National Summit with mentorship attached.",
    action: { kind: "program", programId: "ps" },
  },
  {
    id: "networking-q1",
    area: "programs",
    icon: "net",
    date: "2027-03-14",
    title: "Networking Seminar Q1",
    location: "UPSA, Accra",
    body: "Weak tie outreach, mentorship requests and LinkedIn positioning. Leave with a ninety day plan and three booked conversations.",
    action: { kind: "program", programId: "ns" },
  },
  {
    id: "rc-conference",
    area: "programs",
    icon: "book",
    date: "2027-04-24",
    title: "Reading & Critical Thinking Conference",
    location: "UCC, Cape Coast",
    body: "Case dissection, fallacy spotting and position paper writing with research fellows and editors.",
    action: { kind: "program", programId: "rc" },
  },
  {
    id: "lab-cohort-4",
    area: "lab",
    icon: "code",
    date: "2027-01-30",
    title: "Lab Cohort 4 Applications Open",
    location: "Remote + FIN Hub, Accra",
    body: "Five tracks, paid work sample for shortlisted applicants, then squad onboarding with a mentor and a shipped project per cycle.",
    action: { kind: "lab" },
  },
  {
    id: "partner-briefing",
    area: "partners",
    icon: "net",
    date: "2026-11-26",
    title: "Partner Onboarding Briefing",
    location: "Online · Teams + WhatsApp",
    body: "A working session for HR and CSR leads: endorsement workflow, assessment forms, placement reporting and summit priority access.",
    action: { kind: "invite" },
  },
]

export const labTracks = [
  "Software Engineering",
  "Data Analytics",
  "ML & AI",
  "UI/UX",
  "QA & DevOps",
]

export const labBuilds = [
  "Web and mobile applications for FIN chapters and partner organisations",
  "Data pipelines, dashboards and reporting automation",
  "ML and AI tools including the Super AI assistant knowledge systems",
  "IT consulting, infrastructure and digital transformation support",
]

export const partnerSectors = [
  "Banking",
  "Telecoms",
  "Energy",
  "Health",
  "Insurance",
  "Manufacturing",
  "Construction",
  "Media",
]

export const partnerCampusPartnerships = [
  {
    title: "Cross association collaboration",
    text: "co host events, workshops and bootcamps with academic societies, IT associations and business clubs to pool resources and expand member reach.",
  },
  {
    title: "Corporate and SME partnerships",
    text: "alliances with local businesses, startups, financial institutions and insurance agencies near campus for sponsorship, guest speakers and direct placement channels.",
  },
  {
    title: "Broad networking opportunities",
    text: "alliances woven into every program pillar so speaking showcases, bootcamps and work and study drives carry institutional backing.",
  },
]

export const partnerHowItWorks = [
  "FIN scouts and matches verified students to your roles each vacation cycle",
  "Official endorsement emails validate every candidate credentials",
  "Supervisors return the FIN Assessment Form and performance is tracked",
  "Partners gain priority access to FIN Career Summit recruitment drives",
]

// ---------------------------------------------------------------------------
// Career Guide curriculum
// ---------------------------------------------------------------------------

export interface FinInfographic {
  label: string
  stats: [string, string][]
  chips: string[]
  note: string
}

export interface FinModule {
  title: string
  intro: string
  outcomes: string[]
  lessons: string[]
  lab: string
  assignment: string
  question: string
  alignment: string
  infographic?: FinInfographic
}

export const curriculumIntro =
  "The FIN Career Guide is a seven module curriculum adopted by every campus chapter. It is built the way modern online certificates are built. Each module opens with measurable outcomes, assigns current lessons from Coursera, DataCamp, LinkedIn Learning, Microsoft Learn, HubSpot Academy, freeCodeCamp, Google and Y Combinator, then moves into a practical lab where students produce evidence, a graded assignment assessed by chapter executives, and one reflection question that keeps the learning honest. Modules run along the blueprint cadence: onboarding in the first month, speaking drills every three weeks, skills projects in one month blocks and placement drives before every vacation. Chapter executives teach with this guide, students graduate with a portfolio of verified artefacts, and the FIN Academy certifies completion."

export const modules: FinModule[] = [
  {
    title: "Module 1 — Career Foundations and Personal Audit",
    intro:
      "Every strong career starts with an honest audit. In this module you examine your values, your proven strengths and the problems you care about, then you convert that reflection into a written plan. The output is a career charter that guides your choices in every later module and gives mentors a clear picture of who you are.",
    outcomes: [
      "Build a personal values and strengths map supported by evidence from past projects, roles and coursework.",
      "Set one twelve month career goal with three measurable milestones you can review monthly.",
      "Write a professional narrative that a recruiter can read and understand in sixty seconds.",
    ],
    lessons: [
      "Coursera: Achieving Personal and Professional Success by the Wharton School, for goal setting, values and follow through.",
      "LinkedIn Learning: career management and personal branding foundations.",
      "FIN desk orientation: how the four FIN programs map to your charter.",
    ],
    lab: "Complete the values and strengths worksheet, then hold ten informational conversations across at least three industries. Log every conversation with one insight and one follow up action, and store the log in your chapter portfolio folder.",
    assignment:
      "Submit a one page career charter plus a five hundred word professional narrative. Peers review both with the chapter rubric: clarity, evidence and specificity.",
    question:
      "If money were irrelevant, which problem in Ghana would you spend five years solving, and why?",
    alignment:
      "Delivered inside the one month onboarding and publicity window of SOP Pillar I, so every new member charters early.",
    infographic: {
      label: "Module 1 · Evidence targets",
      stats: [
        ["10", "Conversations"],
        ["1", "Career charter"],
        ["500", "Word narrative"],
      ],
      chips: ["Coursera · Wharton Success", "LinkedIn Learning · Branding"],
      note: "All evidence is logged in the chapter portfolio folder during the one month onboarding window.",
    },
  },
  {
    title: "Module 2 — Study Systems, Focus and Memory",
    intro:
      "Academic strength buys you the time and confidence to intern. This module replaces cramming with a study system: protected focus blocks, spaced repetition and a weekly review that corrects one habit at a time. You measure your baseline, run a two week sprint and prove the difference with data.",
    outcomes: [
      "Design a weekly focus schedule you can sustain even during examinations.",
      "Use spaced repetition to retain technical and course material for the long term.",
      "Run a weekly review that isolates and corrects one study habit at a time.",
    ],
    lessons: [
      "Coursera: Learning How to Learn by McMaster University, for memory, chunking and avoiding the illusion of competence.",
      "LinkedIn Learning: Time Management Fundamentals, for scheduling and protecting focus blocks.",
      "Internet primers on spaced repetition and the Pomodoro technique, including Anki deck setup guides.",
    ],
    lab: "Run a two week focus sprint using twenty five minute blocks with five minute breaks. Build a spaced repetition deck for your hardest course and keep a review log of hours studied and retention scores.",
    assignment:
      "Submit a study system report comparing baseline and week two metrics, naming the single habit you corrected and the evidence for it.",
    question:
      "Which habit cost you the most marks last semester, and exactly what replaces it?",
    alignment:
      "A continuous support module that strengthens every other module and all academic work across the year.",
  },
  {
    title: "Module 3 — Digital, Data and AI Fluency",
    intro:
      "Modern roles read data and work alongside AI. This module takes you from spreadsheets to insight: querying with SQL, modelling in Excel, visualising in Power BI and using AI tools responsibly for research and drafting. The evidence you produce here becomes the centre of your professional portfolio.",
    outcomes: [
      "Query and join data confidently with SQL and explain what each result means.",
      "Build an Excel or Power BI dashboard that answers a real business question.",
      "Use AI tools responsibly for research, drafting and checking your work, with clear disclosure.",
    ],
    lessons: [
      "Coursera: Google AI Essentials and selected modules from the Google Data Analytics Professional Certificate.",
      "DataCamp: Introduction to SQL, Introduction to Python and the Data Analyst with Python track.",
      "Microsoft Learn: Excel essentials and the Power BI Data Analyst learning path.",
    ],
    lab: "Clean a public dataset from Ghana Open Data or the World Bank, build one dashboard and publish a screenshot with a three line insight note to your portfolio.",
    assignment:
      "Deliver one verified portfolio artefact with a one hundred fifty word case note stating the problem, the tool and the result. The Programs and Training Coordinator assesses it.",
    question: "What can you make today that you could not make ninety days ago?",
    alignment:
      "This is the one month skills project of Program 2, and its outputs feed the bootcamp portfolio requirement.",
    infographic: {
      label: "Module 3 · Artefact targets",
      stats: [
        ["1", "Dataset cleaned"],
        ["1", "Dashboard shipped"],
        ["150", "Word case note"],
      ],
      chips: [
        "Coursera · Google AI Essentials",
        "DataCamp · SQL & Python",
        "Microsoft Learn · Power BI",
      ],
      note: "The artefact is assessed by the Programs and Training Coordinator and becomes the centre of your portfolio.",
    },
  },
  {
    title: "Module 4 — Communication and Public Speaking",
    intro:
      "Ideas only travel as far as your delivery carries them. This module trains structure and presence: a hook that earns attention, evidence that holds it and a close that moves people to act. You record yourself, score yourself with the chapter rubric and measure your own improvement across drill cycles.",
    outcomes: [
      "Structure any talk with a hook, two or three evidenced points and a clear close.",
      "Deliver with controlled pace, posture and eye contact in front of a live audience.",
      "Handle questions without losing the thread of your argument.",
    ],
    lessons: [
      "Coursera: Successful Presentation by the University of Colorado Boulder.",
      "LinkedIn Learning: Communication Foundations, for message clarity and audience reading.",
      "FIN masterclass drills: elevator pitches and inter departmental debate rounds.",
    ],
    lab: "Record a three minute talk and score it with the chapter rubric. After one drill cycle record the same talk again and compare the two scores line by line.",
    assignment:
      "Submit the final recording with your rubric score sheet. Chapter evaluation targets the eighty five percent pass mark set by the blueprint, assessed by patrons and guest assessors.",
    question:
      "What feedback do you avoid, and what would change this month if you accepted it?",
    alignment:
      "Runs on the every three weeks masterclass cycle of Program 1 and feeds the annual Chapter Pitch Competition.",
    infographic: {
      label: "Module 4 · Assessment targets",
      stats: [
        ["2", "Recorded talks"],
        ["85%", "Pass target"],
        ["3 wks", "Drill cycle"],
      ],
      chips: [
        "Coursera · Successful Presentation",
        "LinkedIn Learning · Communication",
      ],
      note: "Both recordings are scored with the same chapter rubric so improvement is measurable.",
    },
  },
  {
    title: "Module 5 — Professional Branding and Networking",
    intro:
      "Opportunities move through people. This module builds your public professional identity and a repeatable outreach cadence, so your work stays visible and your network grows even while you study. You leave with a complete LinkedIn presence and a mentor relationship in motion.",
    outcomes: [
      "Publish a complete LinkedIn profile with a clear headline, an about section and featured work.",
      "Run a monthly cadence of three new professional conversations with documented follow ups.",
      "Request mentorship with a one page brief that respects the mentor time.",
    ],
    lessons: [
      "LinkedIn Learning: personal branding and professional networking courses.",
      "HubSpot Academy: inbound content basics for voice and consistency.",
      "FIN Tier 3 publishing rules and brand compliance notes.",
    ],
    lab: "Rebuild your LinkedIn headline, about and featured sections. Hold three new professional conversations this month and draft a one page mentor brief with a single specific ask.",
    assignment:
      "Submit a profile audit score from the Public Relations and Communications Director together with your mentor brief and conversation log.",
    question: "Who is five years ahead of you, and what exactly would you ask them?",
    alignment:
      "Supports Tier 3 publishing and the strategic campus partnerships described in section 4 of the blueprint.",
  },
  {
    title: "Module 6 — Entrepreneurship and Value Creation",
    intro:
      "Not every graduate needs a job; some need a venture. This module teaches you to test ideas cheaply: a lean canvas instead of a long plan, real customer conversations instead of assumptions and a two minute pitch with a clear ask. It is the FIN incubator path in miniature.",
    outcomes: [
      "Test a venture idea with a lean canvas and state the riskiest assumption.",
      "Run customer discovery conversations and record real objections in the customer own words.",
      "Pitch in two minutes with a clear ask and a defined next step.",
    ],
    lessons: [
      "Coursera: Wharton Entrepreneurship Specialization, beginning with Developing the Opportunity.",
      "Y Combinator: Startup School for founders, with weekly practical tasks.",
      "HubSpot Academy: sales enablement basics for early revenue conversations.",
    ],
    lab: "Build a lean canvas for one campus problem, then hold five customer discovery conversations with students or vendors who feel that problem weekly.",
    assignment:
      "Submit the canvas, a discovery summary and a two minute pitch recorded live at a chapter session.",
    question:
      "What resource do you already control that others would pay to access?",
    alignment:
      "Feeds the chapter pitch competition and the National Summit qualification round.",
    infographic: {
      label: "Module 6 · Founder evidence",
      stats: [
        ["1", "Lean canvas"],
        ["5", "Discovery calls"],
        ["2 min", "Live pitch"],
      ],
      chips: [
        "Coursera · Wharton Entrepreneurship",
        "Y Combinator · Startup School",
        "HubSpot · Sales Enablement",
      ],
      note: "The pitch is recorded live at a chapter session and enters the National Summit qualification round.",
    },
  },
  {
    title: "Module 7 — Employability, Placement and Documentation",
    intro:
      "This module converts everything you have built into employment. You produce the documents employers trust, interview with structured evidence and manage the FIN document chain without errors: application, internship letter, supervisor assessment and certificate. It ends with a real application and a logged employer response.",
    outcomes: [
      "Produce a KNUST format CV and a tailored cover letter of under two hundred fifty words.",
      "Interview with structured evidence: verb, task, tool and result in every answer.",
      "Manage the FIN document chain correctly: letter after verified application, assessment from your supervisor, certificate on positive recommendation.",
    ],
    lessons: [
      "LinkedIn Learning: job search strategies and resume writing paths.",
      "Google Career Certificates: portfolio and interview preparation guidance.",
      "FIN SOP Pillar II walkthrough: application, internship letter, submission to HR and the corporate endorsement email.",
    ],
    lab: "Attend a CV clinic and one mock interview with a score sheet, then assemble your full document pack including the internship letter, assessment form and certificate chain.",
    assignment:
      "Complete one full application to a real organisation and log the employer response within four weeks, then present the feedback to your chapter.",
    question:
      "What evidence will an employer see in sixty seconds that you are ready?",
    alignment:
      "Matches the pre vacation placement drives and practises the monthly reporting discipline by the fifth of every month.",
  },
]

export const curriculumReferences =
  "Coursera: Learning How to Learn (McMaster University); Achieving Personal and Professional Success (Wharton); Successful Presentation (University of Colorado Boulder); Google AI Essentials; Google Data Analytics Professional Certificate; Wharton Entrepreneurship Specialization. · DataCamp: Introduction to SQL; Introduction to Python; Data Analyst with Python track; Introduction to Power BI. · LinkedIn Learning: Communication Foundations; Time Management Fundamentals; Personal Branding on Social Media; Job Search Strategies; resume writing paths. · Microsoft Learn: Excel essentials; Power BI Data Analyst path. · HubSpot Academy: Inbound Marketing; Sales Enablement. · freeCodeCamp: Responsive Web Design; JavaScript Algorithms and Data Structures. · Y Combinator: Startup School. · Google Digital Garage: Fundamentals of Digital Marketing. · Labour market context: World Economic Forum Future of Jobs Report 2025; LinkedIn Workplace Learning Report 2024. · Institutional reference: Fortune Intern Network Campus Chapter Blueprint and SOP, 2026. The Programs and Training Coordinator reviews this curriculum with chapter executives every semester so lessons stay current."

/** Plain-text version of the curriculum for the download button. */
export function curriculumAsText() {
  const lines: string[] = [
    "FORTUNE INTERN NETWORK — FIN CAREER GUIDE (CURRICULUM)",
    "Bridging Dreams and Careers",
    "",
    curriculumIntro,
    "",
  ]
  for (const m of modules) {
    lines.push(m.title, "", m.intro, "", "Outcomes")
    m.outcomes.forEach((o) => lines.push(`- ${o}`))
    lines.push("", "Core lessons")
    m.lessons.forEach((l) => lines.push(`- ${l}`))
    lines.push("", `Practical lab: ${m.lab}`, "")
    lines.push(`Assignment and assessment: ${m.assignment}`, "")
    lines.push(`Experimental question: ${m.question}`, "")
    lines.push(`Blueprint alignment: ${m.alignment}`, "", "")
  }
  lines.push("Contemporary sources and references", "", curriculumReferences, "")
  return lines.join("\n")
}
