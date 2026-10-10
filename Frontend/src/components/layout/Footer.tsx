import logo from "../../assets/attach1.png";
import Icon from "../ui/Icon";

function FooterColumn({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div>
      <p className="text-sm font-bold">{title}</p>
      <div className="flex flex-col items-start gap-3 mt-4">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-xs text-white/55 hover:text-white transition-colors"
          >
            {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-footer text-white">
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
              <p className="text-[10px] tracking-widest uppercase text-emerald-300">
                Bridging Dreams and Careers.
              </p>
            </div>
          </div>
          <p className="text-sm text-white/55 mt-5 max-w-xs leading-relaxed">
            Connecting students with opportunities that matter.
          </p>
        </div>

        <FooterColumn
          title="Platform"
          links={[
            { name: "Find Internships", href: "../companypages/" },
            { name: "How It Works", href: "" },
            { name: "Application Tracking", href: "" },
            { name: "Student Dashboard", href: "" },
          ]}
        />

        <FooterColumn
          title="Company"
          links={[
            { name: "About FIN", href: "/about" },
            { name: "Contact", href: "/contact" },
            { name: "Privacy Policy", href: "/privacy-policy" },
            { name: "Terms & Conditions", href: "/terms" },
            { name: "Cookie Policy", href: "/cookie-policy" },
            { name: "Refund Policy", href: "/refund-policy" },
          ]}
        />

        <div>
          <p className="text-sm font-bold">Follow Us</p>
          <div className="flex items-center gap-3 mt-4">
            <a
              href="https://www.linkedin.com/company/fortune-intern-network/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fortune Intern on LinkedIn"
              className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
            >
              <Icon name="linkedin" className="w-5 h-5" />
            </a>
            <a
              href="https://whatsapp.com/channel/0029Val97zy1yT2BGkOZi511"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fortune Intern WhatsApp Channel"
              className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
            >
              <Icon name="whatsapp" className="w-5 h-5" />
            </a>
            <a
              href="https://x.com/fortune_intern1"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fortune Intern on X"
              className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
            >
              <Icon name="x" className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold">Customer Service</p>
          <a
            href="tel:0200313672"
            aria-label="Call Fortune Intern Customer Service"
            className="inline-flex mt-4 text-sm text-white/70 hover:text-white transition-colors"
          >
            0200313672
          </a>
          <br />
          <a
            href="tel:0257038948"
            aria-label="Call Fortune Intern Customer Service"
            className="inline-flex text-sm text-white/70 hover:text-white transition-colors"
          >
            0257038948
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="landing-container py-5 text-xs text-white/40">
          © 2026 Fortune Intern Network. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
