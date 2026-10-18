import http from "k6/http";
import { check, sleep } from "k6";

const configuredBaseUrl = (__ENV.BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
if (!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(configuredBaseUrl)) {
  throw new Error("This test is restricted to a local HTTP server (localhost or 127.0.0.1).");
}

http.setResponseCallback(http.expectedStatuses(401, 403, 429));

export const options = {
  scenarios: {
    login_bots: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "1m", target: 250 },
        { duration: "2m", target: 500 },
        { duration: "3m", target: 1000 },
        { duration: "30s", target: 1000 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
};

export default function () {
  if (__ITER > 0) {
    sleep(30);
    return;
  }

  const response = http.post(
    `${configuredBaseUrl}/api/auth/login`,
    JSON.stringify({
      email: `login-bot-${__VU}@example.invalid`,
      password: "intentionally-wrong-load-test-password",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `k6-login-bot/${__VU}`,
        "Sec-CH-UA": `"Browser-${__VU % 20}"`,
        "Sec-CH-UA-Platform": `"TestOS-${__VU % 8}"`,
        "Sec-CH-UA-Mobile": "?0",
      },
      timeout: "30s",
      tags: { endpoint: "login" },
    },
  );

  check(response, {
    "login is rejected or challenged": (res) => [401, 403, 429].includes(res.status),
  });

  sleep(30);
}
