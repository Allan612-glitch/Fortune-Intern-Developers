import { useEffect, useRef, useState } from "react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileApiPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileApiPromise) {
    turnstileApiPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error("Turnstile did not initialize."));
      };
      script.onerror = () => reject(new Error("Unable to load the security challenge."));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      turnstileApiPromise = undefined;
      throw error;
    });
  }
  return turnstileApiPromise;
}

export default function TurnstileChallenge({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [error, setError] = useState("");
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | undefined;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        widgetId = turnstile.render(container.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => {
            onTokenRef.current("");
            setError("The security check could not be completed. Please try again.");
          },
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load the security challenge.");
        }
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <div>
      <div ref={container} />
      {error && <p className="mt-2 text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
