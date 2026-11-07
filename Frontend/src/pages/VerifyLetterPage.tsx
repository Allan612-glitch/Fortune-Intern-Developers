import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import logo from "../assets/attach1.png";
import { ApiError, apiRequest } from "../services/api";

type LetterVerification = { valid: boolean; reference: string };

type Result =
  | { kind: "valid"; reference: string }
  | { kind: "not-found"; reference: string }
  | { kind: "error"; message: string };

const CONTACT_EMAIL = "fortuneintern.gh@gmail.com";

// References are printed in capitals and never contain spaces, so this makes
// typing "fin/2026/abc" or adding stray spaces still work.
function normalizeReference(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export default function VerifyLetterPage() {
  const [searchParams] = useSearchParams();
  const initialReference = searchParams.get("reference") ?? "";
  const [reference, setReference] = useState(initialReference);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const autoChecked = useRef(false);

  const verify = useCallback(async (rawValue: string) => {
    const value = normalizeReference(rawValue);
    setResult(null);
    if (!value) {
      setValidationError("Enter the reference printed on your letter.");
      return;
    }
    if (value.length > 64) {
      setValidationError("That reference is too long. Check it and try again.");
      return;
    }
    setValidationError("");
    setLoading(true);
    try {
      const response = await apiRequest<LetterVerification>(
        `/api/applications/verify-letter?reference=${encodeURIComponent(value)}`,
      );
      setResult(
        response.valid
          ? { kind: "valid", reference: response.reference }
          : { kind: "not-found", reference: value },
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setResult({ kind: "not-found", reference: value });
      } else if (error instanceof ApiError && error.status === 429) {
        setResult({
          kind: "error",
          message:
            "Too many checks in a short time. Please wait a minute and try again.",
        });
      } else {
        setResult({
          kind: "error",
          message:
            "We couldn't check this reference right now. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // A link such as /verify-letter?reference=FIN/2026/0001 is checked straight away.
  useEffect(() => {
    if (autoChecked.current || !initialReference) return;
    autoChecked.current = true;
    void verify(initialReference);
  }, [initialReference, verify]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void verify(reference);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-border rounded-2xl shadow-sm p-8">
        <img
          src={logo}
          alt="Fortune Intern Network"
          className="w-14 h-14 mx-auto rounded-2xl object-contain"
        />
        <h1 className="text-2xl font-bold text-center mt-5">Verify a Letter</h1>
        <div className="mx-auto mt-3 h-[3px] w-10 rounded-full bg-accent" />
        <p className="text-sm text-muted-foreground text-center mt-4">
          Enter the reference printed on a Fortune Intern Network letter to
          check that we issued it.
        </p>

        <form onSubmit={submit} className="mt-6" noValidate>
          <label className="block text-xs font-semibold">
            Letter reference
            <input
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                setValidationError("");
              }}
              placeholder="FIN/2026/0001"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "reference-error" : undefined}
              className="mt-1.5 w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {validationError && (
              <span
                id="reference-error"
                role="alert"
                className="block text-xs text-red-600 mt-1.5"
              >
                {validationError}
              </span>
            )}
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? "Checking..." : "Verify Letter"}
          </button>
        </form>

        <div aria-live="polite" className="mt-6">
          {result?.kind === "valid" && (
            <div className="rounded-xl border border-border bg-secondary/60 p-4">
              <span className="status-offered inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                ✓ Valid letter
              </span>
              <p className="text-sm mt-3">
                This reference matches a letter issued by Fortune Intern
                Network.
              </p>
              <p className="font-mono text-sm font-semibold text-primary break-all mt-2">
                {result.reference}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                This check confirms the reference is genuine. It does not show
                the details on the letter, so compare the name, institution and
                company on the letter with the person presenting it. If
                anything does not match, email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          )}

          {result?.kind === "not-found" && (
            <div className="rounded-xl border border-border bg-secondary/60 p-4">
              <span className="status-rejected inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                Not found
              </span>
              <p className="text-sm mt-3">
                We could not find a letter with this reference.
              </p>
              <p className="font-mono text-sm font-semibold break-all mt-2">
                {result.reference}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Check the reference for typing mistakes. If it is correct,
                treat the letter as unverified and email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          )}

          {result?.kind === "error" && (
            <p role="alert" className="text-sm text-red-600">
              {result.message}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          <Link to="/" className="text-primary font-semibold hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
