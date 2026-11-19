import type { ReactNode } from "react"
import { ART, type PosterKey } from "./art"

// The 24 pages of the Campus Chapter Blueprint & SOP. Text is copied from the
// teammate's original chapters.html. The wrapper that adds the logo header and
// page footer to each page lives in BlueprintTab.tsx.

export type Photos = Partial<Record<PosterKey, string>>

export type SlideDef = {
  kick: string
  dark?: boolean
  body: ReactNode
}

function Poster(props: {
  art: PosterKey
  ratio: string
  title: string
  text: string
  photos: Photos
}) {
  const { art, ratio, title, text, photos } = props
  const photo = photos[art]
  return (
    <div className="s-body imgbody">
      <div className="poster" style={{ aspectRatio: ratio }}>
        {photo ? <span className="rep-tag">Photo</span> : null}
        <div className="art">
          {photo ? (
            <img className="rep" src={photo} alt={title} />
          ) : (
            <div className="art-svg" dangerouslySetInnerHTML={{ __html: ART[art] }} />
          )}
        </div>
      </div>
      <div className="pcap">
        <b>{title}</b>
        <span>{text}</span>
      </div>
    </div>
  )
}

function Chips({ items, center, flush }: { items: string[]; center?: boolean; flush?: boolean }) {
  return (
    <div
      className="bchips"
      style={{
        ...(center ? { justifyContent: "center" } : {}),
        ...(flush ? { marginTop: 0 } : {}),
      }}
    >
      {items.map((item) => (
        <span className="bchip" key={item}>
          {item}
        </span>
      ))}
    </div>
  )
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="card">
      {title ? <h3>{title}</h3> : null}
      {children}
    </div>
  )
}

/** A procedure page: a tick list on the left and two cards on the right. */
function Sop(props: { title: string; items: ReactNode[]; cards: [string, string][] }) {
  return (
    <div className="s-body">
      <h2 className="st">{props.title}</h2>
      <div className="two">
        <ul className="tick">
          {props.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <div className="stack">
          {props.cards.map(([title, text]) => (
            <Card key={title} title={title}>
              <p>{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

const ROLES: [string, string][] = [
  ["Campus Ambassador", "Primary institutional representative and envoy; drives campus strategy, administrative relations and chapter growth."],
  ["Chapter President", "Directs strategic execution, leads executive meetings, manages department relationships, aligns goals with FIN Corporate."],
  ["Vice President / Operations Lead", "Oversees internal workflows, coordinates committees, ensures execution across all initiatives."],
  ["General Secretary", "Manages official documentation, minutes, organizational records and correspondence."],
  ["Deputy General Secretary", "Assists record keeping, tracks member attendance, steps in during absences."],
  ["Financial Secretary & Treasurer", "Budget allocations, dues tracking, financial audit disclosures."],
  ["PR & Communications Director", "External campaigns, brand positioning, media partnerships, student outreach."],
  ["Media Head", "Digital coverage, multimedia publishing, live event capture, content scheduling."],
  ["Graphic Designer", "Visual branding, creative assets, flyers, decks and communication templates."],
  ["Programs & Training Coordinator", "Formulates and executes bootcamps, workshops, speaking drills and career initiatives."],
]

const PHASES: [string, string, string][] = [
  ["One Month", "Onboarding & Orientation", "A single dedicated month: recruitment, constitution ratification, executive induction and member registration on fortuneintern.com."],
  ["Every 3 Weeks", "Public Speaking & Leadership", "A recurring cycle every three weeks: speech drills, debate rounds and pitch practice, closing with the annual chapter competition."],
  ["One Month Project", "Technical & Digital Skills", "An intensive one month project based bootcamp: design, CV and portfolio engineering, data tools and AI productivity."],
  ["Pre Vacation", "Internships and Work & Study", "Placement drives run before each vacation: corporate internships, attachments, work study roles and national service guidance."],
  ["Final Phase", "Capstones & Transition", "Portfolios, certificates, handover elections and alumni induction close the year."],
]

const STEPS: [string, string][] = [
  ["Ratification & appointment", "Adopt the FIN Campus Chapter Constitution; officially appoint the Campus Ambassador, Executive Committee and Chapter Patron."],
  ["Platform setup", "Onboard executives to the Tier 1 Slack workspace; create the official Tier 2 WhatsApp Group and WhatsApp Channel."],
  ["Calendar integration", "Map the three core programs (Public Speaking, Skills Bootcamp, Internships and Work & Study) to your university semester dates using their cadences."],
  ["Member onboarding", "Run the one month onboarding phase: campus wide recruitment directing students to fortuneintern.com, official social handles and the WhatsApp channels."],
  ["Operational execution", "Hold monthly executive check ins; submit progress and financial reports to FIN Corporate by the 5th of each month."],
]

const SOP_INDEX: [string, string, string][] = [
  ["SOP 01", "Meetings & Minutes", "Quorum, agenda, minutes and filing."],
  ["SOP 02", "Reporting & Records", "Monthly corporate submission by the 5th."],
  ["SOP 03", "Finance & Dues", "Budgets, receipts, dual sign off, audit."],
  ["SOP 04", "Recruitment & Onboarding", "One month intake and induction."],
  ["SOP 05", "Events & Media", "Approvals, coverage, publication."],
  ["SOP 06", "Discipline & Escalation", "Warnings, suspension, Patron review."],
]

export function getSlideDefs(photos: Photos): SlideDef[] {
  return [
    {
      kick: "Campus Chapter Blueprint",
      dark: true,
      body: (
        <div className="s-body center">
          <h1 className="st">
            Fortune Intern Network
            <br />
            <span className="hl">Campus Chapter</span> Operational Blueprint
          </h1>
          <p className="sub">
            The official guide for every FIN tertiary chapter: governance, annual programs, communication architecture, launch protocol and standard operating procedures. One ecosystem, one standard, all campuses.
          </p>
          <Chips center items={["Bridging Dreams and Careers", "Believe · Learn · Succeed"]} />
          <p className="sub" style={{ marginTop: "8mm", fontSize: "12.5px" }}>
            Comprehensive Edition · fortuneintern.com · Aligned to the FIN Campus Chapter Constitution
          </p>
        </div>
      ),
    },
    {
      kick: "Brand Visual",
      body: (
        <Poster
          art="member"
          ratio="6/7"
          title="A FIN member, ready."
          text="The branded kit in the wild: notebook, bottle and desk flag carry the mark and the motto, Bridging Dreams and Careers."
          photos={photos}
        />
      ),
    },
    {
      kick: "1 · Executive Summary",
      body: (
        <div className="s-body">
          <h2 className="st">What is the Fortune Intern Network?</h2>
          <div className="two">
            <Card>
              <p>
                FIN is a <b>professional growth platform and career ecosystem</b> bridging academic education and industry readiness for tertiary students across Africa. Centralized online at <b>fortuneintern.com</b>, it connects campus talent directly with corporate networks, industry leaders and institutional partners.
              </p>
              <Chips items={["Practical skills", "Leadership", "Mentorship", "Bridging Dreams and Careers"]} />
            </Card>
            <div className="stack">
              <Card title="Mission">
                <p>Empower tertiary students through structured technical training, practical leadership experience, public speaking mastery and direct workplace integration.</p>
              </Card>
              <Card title="Vision">
                <p>Build a unified, inter university ecosystem of highly skilled, employment ready and entrepreneurial graduates capable of competing globally.</p>
              </Card>
              <Card title="Governance alignment">
                <p>All chapter activities, leadership selections and operational protocols strictly comply with the FIN Campus Chapter Constitution.</p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      kick: "2 · Governance",
      body: (
        <div className="s-body">
          <h2 className="st">Campus Executive Board</h2>
          <p className="sub">Ten officers plus a Patron, clear accountability. Every chapter operates under this expanded executive committee.</p>
          <div className="roles" style={{ marginTop: "4mm" }}>
            {ROLES.map(([title, text]) => (
              <div className="role" key={title}>
                <b>{title}</b>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      kick: "2 · Governance",
      body: (
        <div className="s-body">
          <h2 className="st">Advisory Oversight &amp; Corporate Reporting</h2>
          <div className="two">
            <Card title="Chapter Patron">
              <p>A designated senior academic faculty member (Professor, Department Head or Dean of Students) who provides institutional guidance, academic backing and administrative oversight to the chapter.</p>
            </Card>
            <div className="stack">
              <Card title="Monthly reporting protocol">
                <p>
                  Operational and financial reports are submitted to the FIN Corporate Team <b>by the 5th of every month</b>, without exception.
                </p>
              </Card>
              <Card title="Constitutional compliance">
                <p>Leadership selection, discipline and program delivery follow the FIN Campus Chapter Constitution; disputes escalate to the Patron then to FIN Corporate.</p>
              </Card>
              <Card title="Executive check ins">
                <p>Monthly executive meetings minuted by the General Secretary and filed with chapter records and corporate reports.</p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      kick: "3 · Programs",
      body: (
        <div className="s-body">
          <h2 className="st">Annual Program Timeline</h2>
          <p className="sub">Five phases with clear cadences across the academic year. Map each phase to your university semester dates during calendar integration.</p>
          <div className="tl">
            {PHASES.map(([when, title, text]) => (
              <div className="ph" key={title}>
                <span className="m">{when}</span>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      kick: "Program 1",
      body: (
        <div className="s-body">
          <h2 className="st">Public Speaking &amp; Executive Communication Masterclass</h2>
          <div className="two">
            <ul className="tick">
              <li><b>Goal:</b> speaking confidence, debate articulation, presentation fluency and workplace communication for all active members.</li>
              <li><b>Cadence:</b> the masterclass runs <b>every 3 weeks</b> throughout the academic year.</li>
              <li><b>Each cycle:</b> speech drills, elevator pitch exercises and an inter departmental debate round.</li>
              <li><b>Annual:</b> Chapter Public Speaking &amp; Pitch Competition; winners advance to the FIN National Summit.</li>
            </ul>
            <div className="stack">
              <Card title="Target outcome">
                <p>85%+ pass rate on formal presentation evaluations conducted by chapter patrons and guest assessors.</p>
              </Card>
              <Card title="Ownership">
                <p>The Programs &amp; Training Coordinator schedules cycles; the Media Head records sessions for Tier 3 publication.</p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      kick: "Brand Visual",
      body: (
        <Poster
          art="speak"
          ratio="4/5"
          title="Chapter session, live."
          text="Campaign poster: public speaking improves communication skills. Use for drill days and the annual pitch competition."
          photos={photos}
        />
      ),
    },
    {
      kick: "Program 2",
      body: (
        <div className="s-body">
          <h2 className="st">Advanced Technical &amp; Digital Skills Bootcamp</h2>
          <div className="two">
            <ul className="tick">
              <li><b>Format:</b> a <b>one month project</b> based bootcamp with a verified output at the end.</li>
              <li><b>Graphic Design &amp; Visual Branding:</b> Photoshop, Canva, branding principles, asset creation.</li>
              <li><b>CV &amp; Portfolio Engineering:</b> modern CVs, LinkedIn profiles, personal branding.</li>
              <li><b>Data Analytics &amp; Tools:</b> Excel modeling, visualization, digital workflow management.</li>
              <li><b>AI &amp; Modern Productivity:</b> practical AI integration for research and work efficiency.</li>
            </ul>
            <div className="stack">
              <Card title="Target outcome">
                <p>100% of participants leave with a verified design portfolio, a standard CV and a complete LinkedIn profile ready for corporate application.</p>
              </Card>
              <Card title="Skills covered">
                <Chips flush items={["Graphic Design", "Public Speaking", "Business Pitching", "Entrepreneurship", "Project Execution", "Strategic Networking"]} />
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      kick: "Brand Visual",
      body: (
        <Poster
          art="skill"
          ratio="4/5"
          title="Invest in Skill."
          text="Bootcamp recruitment poster listing the six learning tracks. Print for campus boards and share on Tier 3 channels."
          photos={photos}
        />
      ),
    },
    {
      kick: "Program 3 · Track A",
      body: (
        <div className="s-body">
          <h2 className="st">Work &amp; Study Support</h2>
          <p className="sub">A continuous campus track that lets members earn while they learn, without compromising academics.</p>
          <div className="two">
            <div className="stack">
              <Card title="Campus work study roles">
                <p>Flexible tutoring, campus event logistics and departmental support assignments matched around lecture timetables.</p>
              </Card>
              <Card title="Insurance sales & agency experience">
                <p>Hands on sales training, lead generation practice and entry level insurance agency placements with partner firms.</p>
              </Card>
            </div>
            <div className="stack">
              <Card title="Cadence">
                <p>Runs continuously through the academic year; openings are broadcast on the Tier 2 WhatsApp Channel as they arise.</p>
              </Card>
              <Card title="Ownership">
                <p>The Programs &amp; Training Coordinator matches members to roles; the Financial Secretary tracks earnings related dues transparency.</p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      kick: "Program 3 · Track B",
      body: (
        <div className="s-body">
          <h2 className="st">Internship Placement Drive</h2>
          <Chips flush items={["Timeline: Pre Vacation"]} />
          <div className="two" style={{ marginTop: "4mm" }}>
            <div className="stack">
              <Card title="Corporate internships & attachments">
                <p>Placement drives open before each vacation window, matching members to internships and attachments across finance, technology and public administration with partner organisations.</p>
              </Card>
              <Card title="National Service guidance">
                <p>Placement advisory and priority onboarding assistance for graduating members entering National Service.</p>
              </Card>
            </div>
            <div className="stack">
              <Card title="Target outcome">
                <p>At least 70% placement rate for eligible chapter members across internships, work study roles, insurance sales and corporate attachments.</p>
              </Card>
              <Card title="Reporting">
                <p>The Vice President / Operations Lead reports placement numbers in the monthly corporate submission by the 5th.</p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      kick: "4 · Communication",
      body: (
        <div className="s-body">
          <h2 className="st">Tiered Communication Architecture</h2>
          <div className="tiers">
            <div className="tier">
              <span className="lb">TIER 1 · EXECUTIVE</span>
              <p><b>Slack Workspaces &amp; Microsoft Teams.</b> Corporate team, campus ambassadors and chapter execs: directives, monthly report submissions, executive meetings and the constitutional file repository.</p>
            </div>
            <div className="tier">
              <span className="lb">TIER 2 · CHAPTER</span>
              <p><b>WhatsApp Group &amp; WhatsApp Channel.</b> Group for execs and active members: coordination and collaboration. Channel for one way official broadcasts, urgent notices, event registration links and weekly announcements without clutter.</p>
            </div>
            <div className="tier">
              <span className="lb">TIER 3 · PUBLIC</span>
              <p><b>fortuneintern.com, LinkedIn, Instagram, X and Discord.</b> Opportunity publishing, applications, resource downloads, achievement spotlights, media campaigns, live updates and cross campus study and mentorship hubs.</p>
            </div>
          </div>
          <p className="sub" style={{ marginTop: "4mm" }}>
            Rule: official notices flow top down from Tier 1 to Tier 3; member feedback flows bottom up through the General Secretary. No chapter announcement is valid outside these channels.
          </p>
        </div>
      ),
    },
    {
      kick: "5 · Brand & Identity",
      body: (
        <div className="s-body">
          <h2 className="st">Brand, Merch &amp; Member Identity</h2>
          <div className="two">
            <ul className="tick">
              <li><b>Motto:</b> Bridging Dreams and Careers. It leads every official creative, banner and document.</li>
              <li><b>Official kit:</b> chapter t shirt, notebook, bottle and desk flag carry the FIN mark and the motto.</li>
              <li><b>Logo discipline:</b> use only the approved logo; navy and gold palette; no stretching, recoloring or unapproved lockups.</li>
              <li><b>Custodians:</b> the Graphic Designer and Media Head hold brand assets and approve all chapter creatives.</li>
              <li><b>Visibility:</b> branded attire at every official program; photo coverage published through Tier 3 channels.</li>
            </ul>
            <div className="stack">
              <Card title="Colour system">
                <p>Navy #0A3161 for authority, gold #F5B927 for energy, paper #F8FAFC for documents. Contrast always meets readability standards.</p>
              </Card>
              <Card title="Approval flow">
                <p>Designer drafts, Media Head reviews, President approves, then publish on Tier 3 only.</p>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      kick: "Brand Visual",
      body: (
        <Poster
          art="tee"
          ratio="4/5"
          title="Official chapter t shirt."
          text="Navy and gold on white with triangle hem motif. Issue to executives at ratification and to members at onboarding."
          photos={photos}
        />
      ),
    },
    {
      kick: "6 · Launch",
      body: (
        <div className="s-body">
          <h2 className="st">Chapter Launch &amp; Implementation Checklist</h2>
          <div className="steps">
            {STEPS.map(([title, text]) => (
              <div className="step" key={title}>
                <span className="n" />
                <div>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      kick: "7 · Standard Operating Procedures",
      dark: true,
      body: (
        <div className="s-body center">
          <h1 className="st">
            Standard Operating <span className="hl">Procedures</span>
          </h1>
          <p className="sub">
            The SOP layer of the comprehensive blueprint: how meetings run, how reports move, how money is handled, how members join, how events ship and how discipline is enforced. Same standard, every chapter.
          </p>
          <div className="sop-grid" style={{ maxWidth: "760px", margin: "6mm auto 0", textAlign: "left" }}>
            {SOP_INDEX.map(([code, title, text]) => (
              <div className="sop" key={code}>
                <span className="code">{code}</span>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      kick: "SOP 01",
      body: (
        <Sop
          title="SOP 01 · Meetings & Minutes"
          items={[
            <><b>Frequency:</b> executive meeting at least once a month; general member meeting once a semester.</>,
            <><b>Quorum:</b> two thirds of the executive board must be present for decisions to bind the chapter.</>,
            <><b>Agenda:</b> circulated by the General Secretary at least 48 hours before the meeting on Tier 1.</>,
            <><b>Minutes:</b> recorded live, approved at the next sitting, signed by the General Secretary and President.</>,
          ]}
          cards={[
            ["Filing", "Approved minutes are stored in the chapter records folder and attached to the monthly corporate report."],
            ["Attendance", "The Deputy General Secretary logs attendance; three unexcused absences trigger a formal check in."],
          ]}
        />
      ),
    },
    {
      kick: "SOP 02",
      body: (
        <Sop
          title="SOP 02 · Reporting & Records"
          items={[
            <><b>Deadline:</b> operational and financial reports reach FIN Corporate by the <b>5th of every month</b>.</>,
            <><b>Contents:</b> membership count, programs run, placements, finances, media output and challenges.</>,
            <><b>Channel:</b> submitted through the Tier 1 workspace; a copy is filed in chapter records.</>,
            <><b>Late reports:</b> flagged to the Patron and the Corporate operations lead after the 7th.</>,
          ]}
          cards={[
            ["Record retention", "Minutes, reports and financial records are kept for the full academic year and handed over at transition."],
            ["Verification", "The Vice President / Operations Lead cross checks figures before the President signs the submission."],
          ]}
        />
      ),
    },
    {
      kick: "SOP 03",
      body: (
        <Sop
          title="SOP 03 · Finance & Dues"
          items={[
            <><b>Budget:</b> a semester budget is drafted by the Financial Secretary and approved by the executive board.</>,
            <><b>Receipts:</b> every inflow and outflow is receipted and logged in the chapter ledger.</>,
            <><b>Dual sign off:</b> expenditures require the Financial Secretary and the President (or Patron above threshold).</>,
            <><b>Dues:</b> member dues are tracked per person; arrears are reported privately, never publicly shamed.</>,
          ]}
          cards={[
            ["Audit", "A financial disclosure accompanies every monthly report; the Patron may request a full audit at any time."],
            ["Transparency", "Members may inspect the ledger through the Financial Secretary on request."],
          ]}
        />
      ),
    },
    {
      kick: "SOP 04",
      body: (
        <Sop
          title="SOP 04 · Recruitment & Onboarding"
          items={[
            <><b>Window:</b> the one month onboarding phase opens each academic year.</>,
            <><b>Channels:</b> campus wide campaign directing students to fortuneintern.com and the official WhatsApp channels.</>,
            <><b>Registration:</b> every member registers on the portal and is added to the Tier 2 group.</>,
            <><b>Induction:</b> orientation covers the constitution, the three programs, the brand and the code of conduct.</>,
          ]}
          cards={[
            ["Membership register", "The General Secretary maintains the register; the Deputy tracks attendance and engagement."],
            ["Kit", "New members receive the branded kit and are photographed for the chapter gallery."],
          ]}
        />
      ),
    },
    {
      kick: "SOP 05",
      body: (
        <Sop
          title="SOP 05 · Events & Media"
          items={[
            <><b>Proposal:</b> event concept, budget and date submitted to the executive board two weeks ahead.</>,
            <><b>Approval:</b> President approves; Patron notified for institutional events.</>,
            <><b>Creative:</b> Graphic Designer produces assets; Media Head reviews; President signs off before publication.</>,
            <><b>Coverage:</b> Media Head captures photos and video; highlights published on Tier 3 within 48 hours.</>,
          ]}
          cards={[
            ["Brand compliance", "Only approved logo lockups, navy and gold palette, and the motto on every creative."],
            ["Archive", "Event photos, flyers and reports are archived in chapter records and the gallery."],
          ]}
        />
      ),
    },
    {
      kick: "SOP 06",
      body: (
        <Sop
          title="SOP 06 · Discipline & Escalation"
          items={[
            <><b>Step 1:</b> private verbal warning by the President or General Secretary, logged in minutes.</>,
            <><b>Step 2:</b> written warning with a corrective action plan and a review date.</>,
            <><b>Step 3:</b> suspension of duties pending Patron review for repeated or serious breaches.</>,
            <><b>Step 4:</b> removal from office or membership per the constitution, with Corporate notified.</>,
          ]}
          cards={[
            ["Fair process", "The member is heard at every step; decisions are documented and communicated in writing."],
            ["Escalation", "Disputes between officers escalate to the Patron, then to FIN Corporate for final resolution."],
          ]}
        />
      ),
    },
    {
      kick: "Adopt & Execute",
      dark: true,
      body: (
        <div className="s-body center" style={{ justifyContent: "center" }}>
          <h1 className="st" style={{ maxWidth: "22ch", margin: "0 auto" }}>
            One network. One standard. <span className="hl">Every campus.</span>
          </h1>
          <p className="sub" style={{ margin: "6mm auto 0", maxWidth: "60ch" }}>
            Adopt this blueprint, ratify your executive board, and plug your chapter into the FIN ecosystem today. Support is one message away.
          </p>
          <Chips center items={["fortuneintern.com", "fortuneintern.gh@gmail.com", "+233 20 031 3672", "+233 25 703 8948"]} />
          <p className="sub" style={{ marginTop: "8mm", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase" }}>
            Bridging Dreams and Careers
          </p>
        </div>
      ),
    },
  ]
}
