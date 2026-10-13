import React from "react";
import Icon from "../../components/ui/Icon";

export default function ContactUs() {
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
                        <li><span className="font-bold text-[#0B172A]">Email:</span> <a href="mailto:fortuneintern.gh@gmail.com" className="text-blue-600 underline">fortuneintern.gh@gmail.com</a></li>
                        <li><span className="font-bold text-[#0B172A]">Phone:</span> <a href="tel:+233200313672" className="text-blue-600 underline">+233 20 031 3672</a> and <a href="tel:+233257038948" className="text-blue-600 underline">+233 25 703 8948</a> (WhatsApp)</li>
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
                        <li><span className="font-bold text-[#0B172A]">Locations:</span> Accra and Kumasi, Ghana</li>
                    </ul>
                </div>

                <h2 className="font-extrabold text-[#0b172a] mt-12 mb-6 text-3xl">Send us a message</h2>

                <form className="flex flex-col gap-6">
                    <div className="flex flex-col">
                        <label className="mb-2 font-bold text-sm text-[#0B172A]">Your full name</label>
                        <input type="text" className="bg-white p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"/>
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-2 font-bold text-sm text-[#0B172A]">Your email address</label>
                        <input type="email" className="bg-white p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"/>
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-2 font-bold text-sm text-[#0B172A]">How can we help?</label>
                        <textarea rows="6" className="bg-white p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-y"></textarea>
                    </div>

                   <div className="flex items-start gap-3 mt-2">
                     <input type="checkbox" className="mt-1 w-4 h-4 shrink-0 cursor-pointer" />
                     <p className="text-sm">
                       I consent to Fortune Intern Network processing the information provided in this form for the purpose of responding to my enquiry, in line with the <a href="#" className="font-bold text-[#0B172A] underline">Privacy Policy</a>.
                     </p>
                   </div>

                    <div>
                        <button type="submit" className="bg-[#0B172A] text-white font-bold py-3 px-6 rounded-lg mt-4 hover:bg-slate-800 transition-colors">
                            Send message
                        </button>
                    </div>
                    <p className="texts-gray-400 text-sm">We respond within one to two working days.</p>
                </form>
            </div>
          </div>
        </div>
    );
}