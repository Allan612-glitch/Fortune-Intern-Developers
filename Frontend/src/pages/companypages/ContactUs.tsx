import React from "react";

export default function ContactUs() {
    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col pt-12 pb-24 px-4 sm:px-8 md:px-16 lg:px-32">
          <div className="max-w-4xl w-full mx-auto text-slate-700">
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-[#0B172A] mb-4">
                Contact Us
                </h1>
                <hr className="border-t-[3px] border-yellow-500 w-full" />

                <div className="bg-card rounded-3xl p-6 mt-12">
                    <ul className="">
                        <li><span className="font-bold">Email:</span> fortuneintern.gh@gmail.com</li>
                        <li><span className="font-bold">Phone:</span> fortuneintern.gh@gmail.com</li>
                        <li><span className="font-bold">WhatsApp Channel:</span> fortuneintern.gh@gmail.com</li>
                        <li><span className="font-bold">LinkedIn:</span> fortuneintern.gh@gmail.com</li>
                        <li><span className="font-bold">X:</span> fortuneintern.gh@gmail.com</li>
                        <li><span className="font-bold">Instagram:</span> fortuneintern.gh@gmail.com</li>
                        <li><span className="font-bold">Locations:</span> fortuneintern.gh@gmail.com</li>
                    </ul>
                </div>

                <h1 className="font-extrabold text-[#0b172a] mt-8 text-3xl">Send Us a Message</h1>

                <form action="" method="" className="flex flex-col">
                    <label className="mt-4">Your full name</label>
                    <input type="text" className="bg-card p-3 border-outline-black rounded-xl"/>

                    <label className="mt-8">Your email address</label>
                    <input type="text" className="bg-card p-3 border-outline-black rounded-xl"/>

                    <label className="mt-8">How can we help?</label>
                    <input type="textarea" className="bg-card p-3 border-outline-black rounded-xl"/>

                   <div className="flex">
                     <input type="checkbox" className="w-10 " />
                    <p className="mt-4 ml-4">I consent to Fortune Intern Network processing the information provided in this form for the purpose of responding to my enquiry, in line with the <span>Privacy Policy</span>.</p>
                   </div>

                    <button className="">Send Message</button>
                    <p>We respond within one to two working days.</p>
                </form>
            </div>
          </div>
        </div>
    );
}