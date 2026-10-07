import React from "react";

export default function ContactUs() {
    return (
        <div>
            <h1>Contact Us</h1>
            <div></div>

            <form>
                <label htmlFor="name">Name:</label>
                <input type="text" id="name" name="name" />
                <label htmlFor="email">Email:</label>
                <input type="email" id="email" name="email" />
                <label htmlFor="message">Message:</label>
                <textarea id="message" name="message"></textarea>
                <button type="submit">Submit</button>
            </form>
        </div>
    );
}