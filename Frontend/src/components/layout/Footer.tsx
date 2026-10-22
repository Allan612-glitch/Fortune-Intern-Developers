import { Link } from "react-router-dom";
import logo from "../../assets/attach1.png";
import Icon from "../ui/Icon";
import { openCookieSettings } from "../../services/consent";

function FooterColumn({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{title}</p>
      <div className="flex flex-col items-start gap-3 mt-4">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.href}
            className="text-xs text-white/75 hover:text-white transition-colors"
          >
            {link.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-footer text-white border-t-4 border-accent">
      <div className="landing-container py-12 grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] gap-10">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt=""
              className="w-11 h-11 rounded-xl object-contain bg-white"
            />
            <div>
              <p className="font-display text-xl">Fortune Intern Network</p>
              <p className="text-[10px] tracking-widest uppercase text-accent">
                Bridging Dreams and Careers.
              </p>
            </div>
          </div>
          <p className="text-sm text-white/75 mt-5 max-w-xs leading-relaxed">
            Connecting students with opportunities that matter.
          </p>
        </div>

        <FooterColumn
          title="Platform"
          links={[
            { name: "Find Internships", href: "/#internships" },
            { name: "How It Works", href: "/#how-it-works" },
            { name: "Application Tracking", href: "/app/applications" },
            { name: "Student Dashboard", href: "/app/dashboard" },
          ]}
        />

        <FooterColumn
          title="Company"
          links={[
            { name: "About Us", href: "/about" },
            { name: "Contact", href: "/contact" },
            { name: "Privacy Policy", href: "/privacy-policy" },
            { name: "Terms & Conditions", href: "/terms" },
          ]}
        />

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Follow Us</p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <a
              href="https://www.linkedin.com/company/fortune-intern-network/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fortune Intern on LinkedIn"
              className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Icon name="linkedin" className="w-5 h-5" />
            </a>
            <a
              href="https://whatsapp.com/channel/0029Val97zy1yT2BGkOZi511"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fortune Intern WhatsApp Channel"
              className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Icon name="whatsapp" className="w-5 h-5" />
            </a>
            <a
              href="https://x.com/fortune_intern1"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fortune Intern on X"
              className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Icon name="x" className="w-5 h-5" />
            </a>
            <a
              href="https://www.instagram.com/fortuneintern/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fortune Intern on Instagram"
              className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Icon name="instagram" className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Customer Service</p>
          <a
            href="tel:+233200313672"
            aria-label="Call Fortune Intern Customer Service on 0200313672"
            className="inline-flex mt-4 text-sm text-white/70 hover:text-white transition-colors"
          >
            0200313672
          </a>
          <br />
          <a
            href="tel:+233257038948"
            aria-label="Call Fortune Intern Customer Service on 0257038948"
            className="inline-flex text-sm text-white/70 hover:text-white transition-colors"
          >
            0257038948
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="landing-container py-5 text-xs text-white/75 flex flex-wrap items-center justify-between gap-3">
          <span>© 2026 Fortune Intern Network. All rights reserved.</span>
          <button
            type="button"
            onClick={openCookieSettings}
            className="text-white/75 hover:text-white transition-colors underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
          >
            Cookie settings
          </button>
        </div>
      </div>
    </footer>
  );
}
