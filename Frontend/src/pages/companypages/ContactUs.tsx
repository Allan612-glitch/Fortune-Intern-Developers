import React, { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/ui/Icon";
import { ApiError } from "../../services/api";
import { sendContactMessage } from "../../services/contact";

export default function ContactUs() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;

        const form = event.currentTarget;
        const formData = new FormData(form);
        setIsSubmitting(true);
        setFeedback(null);
        try {
            await sendContactMessage({
                name: String(formData.get("name") || ""),
                email: String(formData.get("email") || ""),
                message: String(formData.get("message") || ""),
                consent: formData.get("consent") === "on",
            });
            form.reset();
            setFeedback({ type: "success", message: "Your message has been sent. We’ll respond within one to two working days." });
        } catch (error) {
            setFeedback({
                type: "error",
                message: error instanceof ApiError && error.status === 503
                    ? "We couldn’t send your message right now. Please email fortuneintern.gh@gmail.com."
                    : "We couldn’t send your message. Please try again or email fortuneintern.gh@gmail.com.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col pt-12 pb-24 px-4 sm:px-8 md:px-16 lg:px-32">
          <div className="max-w-3xl w-full mx-auto text-slate-700">
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-[#0B172A] mb-4">
                Contact Us
                </h1>
                <hr className="border-t-[3px] border-yellow-500 w-full" />

                <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-10">
                    <ul className="space-y-4">
                        <li className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon name="email" className="h-5 w-5" /></span>
                          <a href="mailto:fortuneintern.gh@gmail.com" className="text-blue-600 underline underline-offset-2">fortuneintern.gh@gmail.com</a>
                        </li>
                        <li className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon name="phone" className="h-5 w-5" /></span>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <a href="tel:+233200313672" className="text-blue-600 underline underline-offset-2">+233 20 031 3672</a>
                            <span>and</span>
                            <a href="tel:+233257038948" className="text-blue-600 underline underline-offset-2">+233 25 703 8948</a>
                          </span>
                        </li>
                        <li className="flex items-center gap-3">
                          <a href="https://whatsapp.com/channel/0029Val97zy1yT2BGkOZi511" target="_blank" rel="noopener noreferrer" aria-label="Fortune Intern WhatsApp Channel" className="flex items-center gap-3 text-[#128C7E] hover:text-[#075E54] transition-colors">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50"><Icon name="whatsapp" className="h-5 w-5" /></span>
                            <span className="underline underline-offset-2">Join our WhatsApp channel for updates</span>
                          </a>
                        </li>
                        <li className="flex items-center gap-3">
                          <a href="https://www.linkedin.com/company/fortune-intern-network/" target="_blank" rel="noopener noreferrer" aria-label="Fortune Intern on LinkedIn" className="flex items-center gap-3 text-[#0A66C2] hover:text-[#084d91] transition-colors">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50"><Icon name="linkedin" className="h-5 w-5" /></span>
                            <span className="underline underline-offset-2">Fortune Intern Network</span>
                          </a>
                        </li>
                        <li className="flex items-center gap-3">
                          <a href="https://x.com/fortune_intern1" target="_blank" rel="noopener noreferrer" aria-label="Fortune Intern on X" className="flex items-center gap-3 text-[#0B172A] hover:text-slate-600 transition-colors">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"><Icon name="x" className="h-5 w-5" /></span>
                            <span className="underline underline-offset-2">@fortune_intern1</span>
                          </a>
                        </li>
                        <li className="flex items-center gap-3">
                          <a href="https://www.instagram.com/fortuneintern/" target="_blank" rel="noopener noreferrer" aria-label="Fortune Intern on Instagram" className="flex items-center gap-3 text-[#C13584] hover:text-[#96266a] transition-colors">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50"><Icon name="instagram" className="h-5 w-5" /></span>
                            <span className="underline underline-offset-2">@fortuneintern</span>
                          </a>
                        </li>
                        <li className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Icon name="pin" className="h-5 w-5" /></span>
                          <span>Accra and Kumasi, Ghana</span>
                        </li>
                    </ul>
                </div>

                <h2 className="font-extrabold text-[#0b172a] mt-12 mb-6 text-3xl">Send us a message</h2>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                    <div className="flex flex-col">
                        <label htmlFor="contact-name" className="mb-2 font-bold text-sm text-[#0B172A]">Your full name</label>
                        <input id="contact-name" name="name" type="text" required className="bg-white p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"/>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="contact-email" className="mb-2 font-bold text-sm text-[#0B172A]">Your email address</label>
                        <input id="contact-email" name="email" type="email" required className="bg-white p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"/>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="contact-message" className="mb-2 font-bold text-sm text-[#0B172A]">How can we help?</label>
                        <textarea id="contact-message" name="message" rows={6} required className="bg-white p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-y"></textarea>
                    </div>

                   <div className="flex items-start gap-3 mt-2">
                      <input id="contact-consent" name="consent" type="checkbox" required className="mt-1 w-4 h-4 shrink-0 cursor-pointer" />
                     <p className="text-sm">
                       I consent to Fortune Intern Network processing the information provided in this form for the purpose of responding to my enquiry, in line with the <Link to="/privacy-policy" className="font-bold text-[#0B172A] underline">Privacy Policy</Link>.
                     </p>
                   </div>

                    <div>
                         <button type="submit" disabled={isSubmitting} className="bg-[#0B172A] text-white font-bold py-3 px-6 rounded-lg mt-4 hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                             {isSubmitting ? "Sending..." : "Send message"}
                        </button>
                    </div>
                     <p className="text-gray-500 text-sm">We respond within one to two working days.</p>
                     {feedback && (
                         <p role="status" aria-live="polite" className={`text-sm ${feedback.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
                             {feedback.message}
                         </p>
                     )}
                </form>
            </div>
          </div>
        </div>
    );
}