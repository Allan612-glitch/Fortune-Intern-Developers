import http from "k6/http";
import { check, sleep } from "k6";

const configuredBaseUrl = (__ENV.BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
if (!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(configuredBaseUrl)) {
  throw new Error("This test is restricted to a local HTTP server (localhost or 127.0.0.1).");
}

const successEmail = __ENV.LOGIN_SUCCESS_EMAIL || "";
const successPassword = __ENV.LOGIN_SUCCESS_PASSWORD || "";
if (Boolean(successEmail) !== Boolean(successPassword)) {
  throw new Error("Set both LOGIN_SUCCESS_EMAIL and LOGIN_SUCCESS_PASSWORD to enable successful logins.");
}

const successVus = successEmail.includes("{vu}") ? Number(__ENV.LOGIN_SUCCESS_VUS || "5") : 1;
if (!Number.isInteger(successVus) || successVus < 1) {
  throw new Error("LOGIN_SUCCESS_VUS must be a positive integer.");
}

http.setResponseCallback(http.expectedStatuses(200, 401, 403, 429));

const warmupAndSteadyStages = (steadyVus) => [
  { duration: "30s", target: Math.min(2, steadyVus) },
  { duration: "30s", target: steadyVus },
  { duration: "2m", target: steadyVus },
  { duration: "30s", target: 0 },
];

const scenarios = {
  invalid_login_burst_and_sustain: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: warmupAndSteadyStages(10),
    gracefulRampDown: "30s",
    exec: "invalidLogin",
  },
};

if (successEmail) {
  scenarios.successful_login_burst_and_sustain = {
    executor: "ramping-vus",
    startVUs: 0,
    stages: warmupAndSteadyStages(successVus),
    gracefulRampDown: "30s",
    exec: "successfulLogin",
  };
}

export const options = { scenarios };

function postLogin(email, password, tag) {
  const response = http.post(
    `${configuredBaseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `k6-login-bot/${__VU}`,
        "Sec-CH-UA": `"Browser-${__VU % 20}"`,
        "Sec-CH-UA-Platform": `"TestOS-${__VU % 8}"`,
        "Sec-CH-UA-Mobile": "?0",
      },
      timeout: "30s",
      tags: { endpoint: "login", scenario: tag },
    },
  );
  return response;
}

export function invalidLogin() {
  const response = postLogin(
    `login-bot-${__VU}@example.invalid`,
    "intentionally-wrong-load-test-password",
    "invalid",
  );

  check(response, {
    "invalid login is rejected or rate-limited": (res) => [401, 403, 429].includes(res.status),
  });
  sleep(6);
}

export function successfulLogin() {
  const email = successEmail.replace("{vu}", String(__VU));
  const response = postLogin(email, successPassword, "successful");

  check(response, {
    "successful login succeeds or is rate-limited": (res) => [200, 429].includes(res.status),
  });
  sleep(6);
}
