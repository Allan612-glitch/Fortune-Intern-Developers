interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  text: string;
  align?: "left" | "center";
}

export default function SectionHeading({
  eyebrow,
  title,
  text,
  align = "center",
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      <p className="section-copy">{text}</p>
    </div>
  );
}
