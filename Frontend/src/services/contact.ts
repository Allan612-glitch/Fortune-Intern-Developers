import { apiRequest } from "./api";

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
  consent: boolean;
}

export function sendContactMessage(payload: ContactMessage) {
  return apiRequest<{ message: string }>("/api/contact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
