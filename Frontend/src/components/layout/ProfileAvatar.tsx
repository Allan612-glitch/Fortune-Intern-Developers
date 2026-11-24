export default function ProfileAvatar({ initials, photoUrl, className }: {
  initials: string;
  photoUrl?: string | null;
  className: string;
}) {
  return (
    <span aria-hidden="true" className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold ${className}`}>
      {initials}
      {photoUrl && (
        <img
          key={photoUrl}
          src={photoUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
        />
      )}
    </span>
  );
}
