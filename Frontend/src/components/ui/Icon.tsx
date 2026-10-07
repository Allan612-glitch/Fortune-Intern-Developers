import React from "react";

const paths: Record<string, React.ReactNode> = {
  menu: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
  ),
  close: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
  ),
  arrow: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5l5 5-5 5" />
  ),
  check: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  ),
  search: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z" />
  ),
  send: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  ),
  chart: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
  ),
  growth: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17l6-6 4 4 8-9m-5 0h5v5" />
  ),
  pin: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
  ),
  briefcase: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 6V4h6v2m-12 5h18m-16-5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
  ),
  code: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 9l-3 3 3 3m8-6l3 3-3 3m-2-9l-4 12" />
  ),
  bookmark: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-6-4-6 4V4z" />
  ),
  linkedin: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 9v9m0-13v.01M10 18v-5a3 3 0 016 0v5m-6-5a3 3 0 016 0m0 0v5M3 3h18v18H3V3z" />
  ),
  whatsapp: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 11.5a8 8 0 01-11.8 7L4 20l1.5-4.1A8 8 0 1120 11.5zm-5.2 2.2c-.2.5-.8.8-1.3.6-2.2-.8-3.7-2.1-4.6-4.2-.2-.5 0-1.1.5-1.4l.6-.3.8 1.4-.5.5c.5.9 1.1 1.5 2 2l.5-.5 1.5.7.5.6z" />
  ),
  x: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4l14 16M19 4L5 20" />
  ),
};

interface IconProps {
  name: string;
  className?: string;
}

export default function Icon({ name, className = "w-5 h-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
