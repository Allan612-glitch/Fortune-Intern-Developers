import React from "react";

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
                        <li><span className="font-bold text-[#0B172A]">WhatsApp channel:</span> <a href="#" className="text-blue-600 underline">join for updates</a></li>
                        <li><span className="font-bold text-[#0B172A]">LinkedIn:</span> <a href="#" className="text-blue-600 underline">Fortune Intern Network</a></li>
                        <li><span className="font-bold text-[#0B172A]">X:</span> <a href="#" className="text-blue-600 underline">@fortune_intern1</a></li>
                        <li><span className="font-bold text-[#0B172A]">Instagram:</span> <a href="#" className="text-blue-600 underline">@fortuneintern</a></li>
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
                    <p className="text-gray-400 text-sm">We respond within one to two working days.</p>
                </form>
            </div>
          </div>
        </div>
    );
}