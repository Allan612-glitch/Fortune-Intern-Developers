import type { ReactNode } from "react";

interface AsyncStateProps {
  kind: "loading" | "error" | "empty";
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export default function AsyncState({
  kind,
  message,
  onRetry,
  children,
}: AsyncStateProps) {
  const isError = kind === "error";

  return (
    <div
      className={`rounded-2xl border p-6 text-center ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-border bg-white text-muted-foreground"
      }`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {kind === "loading" && (
        <span
          className="mx-auto mb-3 block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      )}
      <p className="text-sm">{message}</p>
      {children}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`mt-4 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
            isError
              ? "border-red-300 bg-white text-red-800 hover:bg-red-100 focus-visible:ring-red-700"
              : "border-border text-primary hover:bg-secondary focus-visible:ring-primary"
          }`}
        >
          Try again
        </button>
      )}
    </div>
  );
}
