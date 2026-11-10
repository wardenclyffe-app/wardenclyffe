import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const combinedImage =
  process.env.WARDENCLYFFE_MCPL_E2E_COMBINED_IMAGE ??
  "wardenclyffe-combined:branding-check";
const dashboardImage =
  process.env.WARDENCLYFFE_MCPL_E2E_DASHBOARD_IMAGE ??
  "wardenclyffe-dashboard:local";
const run = (...args) => {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 60000,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `Docker ${args[0]} failed: ${result.error?.message ?? result.stderr}`,
    );
  return (
    args[0] === "logs" ? result.stdout + result.stderr : result.stdout
  ).trim();
};
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Cannot allocate a loopback acceptance port."));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
const request = async (url, options = {}, timeout = 15000) => {
  const controller = new AbortController();
  // Keep the deadline referenced so an idle undici connection cannot end the run.
  const deadline = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(deadline);
  }
};
const ready = async (url, name) => {
  let failure = "Not yet reachable.";
  for (let attempt = 0; attempt < 60; attempt++) {
    if (run("inspect", "--format", "{{.State.Running}}", name) !== "true")
      throw new Error(`Acceptance container exited before readiness: ${name}`);
    try {
      const response = await request(url, {}, 2000);
      if (response.ok) {
        if (url.endsWith("/api/instance")) {
          const instance = await response.json();
          assert.equal(
            typeof instance.setup_required,
            "boolean",
            "Instance readiness must return its API shape.",
          );
        } else {
          assert.match(
            response.headers.get("content-type") ?? "",
            /text\/html/,
          );
        }
        return;
      }
      failure = `HTTP ${response.status}`;
    } catch (error) {
      failure = `${error.message}: ${
        error.cause?.message ?? "no underlying error"
      }`;
    }
    await sleep(1000);
  }
  throw new Error(`Acceptance readiness timed out for ${url}: ${failure}`);
};

const directory = mkdtempSync(path.join(tmpdir(), "wardenclyffe-mcpl-"));
const containers = [];
const secrets = [];
const secret = (value) => {
  secrets.push(value);
  return value;
};
let browser;
let page;
try {
  run("image", "inspect", combinedImage);
  run("image", "inspect", dashboardImage);
  const managementPort = await freePort();
  let dashboardPort = await freePort();
  while (dashboardPort === managementPort) dashboardPort = await freePort();
  const management = `http://127.0.0.1:${managementPort}`;
  const dashboard = `http://127.0.0.1:${dashboardPort}`;
  const suffix = randomBytes(6).toString("hex");
  const config = path.join(directory, "config.yaml");
  writeFileSync(
    config,
    `server:
  listenAddress: ":8080"
  exposedAddress: "${management}"
  healthcheckAddress: ":9000"
  metricsPort: 9090
  logLevel: "info"
  logFile: "console"
  authSecret: "${secret(randomBytes(32).toString("base64"))}"
  dataDir: "/data"
  disableAnonymousMetrics: true
  disableGeoliteUpdate: true
  auth:
    issuer: "${management}/oauth2"
    dashboardRedirectURIs:
      - "${dashboard}/nb-auth"
      - "${dashboard}/nb-silent-auth"
  store:
    engine: "sqlite"
    encryptionKey: "${secret(randomBytes(32).toString("base64"))}"
`,
    { mode: 0o600 },
  );
  const managementName = `wardenclyffe-mcpl-management-${suffix}`;
  containers.push(managementName);
  run(
    "run",
    "-d",
    "--pull=never",
    "--name",
    managementName,
    "-p",
    `127.0.0.1:${managementPort}:8080`,
    "--mount",
    `type=bind,source=${config},target=/etc/wardenclyffe/config.yaml,readonly`,
    "--mount",
    "type=volume,target=/data",
    "-e",
    "NB_DISABLE_GEOLOCATION=true",
    combinedImage,
    "--config",
    "/etc/wardenclyffe/config.yaml",
  );
  await ready(`${management}/api/instance`, managementName);
  const email = `mcpl-${suffix}@localhost.test`;
  const password = secret(`${randomBytes(24).toString("hex")}aA!9`);
  const setup = await request(`${management}/api/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "MCPL acceptance owner" }),
  });
  assert.ok(setup.ok, `Fresh setup returned HTTP ${setup.status}`);

  const dashboardName = `wardenclyffe-mcpl-dashboard-${suffix}`;
  containers.push(dashboardName);
  const env = {
    AUTH_AUTHORITY: `${management}/oauth2`,
    AUTH_CLIENT_ID: "wardenclyffe-dashboard",
    AUTH_AUDIENCE: "wardenclyffe-dashboard",
    AUTH_SUPPORTED_SCOPES: "openid profile email offline_access",
    AUTH_REDIRECT_URI: "/nb-auth",
    AUTH_SILENT_REDIRECT_URI: "/nb-silent-auth",
    USE_AUTH0: "false",
    WARDENCLYFFE_MGMT_API_ENDPOINT: management,
    WARDENCLYFFE_MGMT_GRPC_API_ENDPOINT: management,
    WARDENCLYFFE_TOKEN_SOURCE: "accessToken",
  };
  run(
    "run",
    "-d",
    "--pull=never",
    "--name",
    dashboardName,
    "-p",
    `127.0.0.1:${dashboardPort}:80`,
    ...Object.entries(env).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
    dashboardImage,
  );
  await ready(`${dashboard}/ui-events`, dashboardName);
  browser = await chromium.launch();
  page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(15000);
  await page.goto(`${dashboard}/ui-events`);
  await page
    .getByRole("textbox", { name: "Email Address", exact: true })
    .fill(email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Skip to Dashboard", { exact: true }).click();
  await page
    .getByRole("dialog", { name: "Onboarding", exact: true })
    .waitFor({ state: "hidden" });
  const setupModal = page.getByTestId("setup-wardenclyffe-modal");
  if (await setupModal.isVisible()) {
    await setupModal.getByTestId("modal-close").click();
    await setupModal.waitFor({ state: "hidden" });
  }
  const admin = page.getByRole("region", {
    name: "Database UI Events",
    exact: true,
  });
  await admin.waitFor();
  // Populate the real management-backed editor, not a fixture or intercepted API.
  await admin
    .getByLabel("Canonical target", { exact: true })
    .fill("ui.events.editor.title");
  await admin
    .getByLabel("Title", { exact: true })
    .fill("MCPL saved content acceptance");
  await admin
    .getByLabel("Plain-text content", { exact: true })
    .fill("Content persisted by the real management API.");
  await admin.getByLabel("Trigger", { exact: true }).selectOption("manual");
  await admin.getByRole("button", { name: "Save event", exact: true }).click();
  await admin
    .getByText("Event saved to management.", { exact: true })
    .waitFor();
  await page.reload();
  const panel = page.getByRole("region", {
    name: "MCPL live recipes",
    exact: true,
  });
  assert.equal(
    JSON.parse(
      await panel.getByLabel("JSON Schema for MCPL recipes").inputValue(),
    ).additionalProperties,
    false,
    "The deployed panel must expose its strict machine-readable recipe schema.",
  );
  await panel
    .getByLabel("Use saved content")
    .selectOption({ label: "MCPL saved content acceptance" });
  await panel
    .getByRole("button", { name: "Start observing recipe", exact: true })
    .click();
  const title = admin.getByLabel("Title", { exact: true });
  await title.click();
  await panel.getByRole("article").first().waitFor();
  assert.match(
    await panel.getByRole("article").first().innerText(),
    /Content persisted by the real management API/,
  );
  assert.match(
    await panel.getByRole("article").first().innerText(),
    /ui.focus on ui.events.editor.title/,
  );
  const before = await panel.getByRole("article").count();
  await title.dispatchEvent("focusin");
  assert.equal(
    await panel.getByRole("article").count(),
    before,
    "Synthetic focus must not compose.",
  );
  await page.evaluate(() => {
    const duplicate = document.createElement("input");
    duplicate.dataset.uiTarget = "ui.events.editor.title";
    duplicate.id = "mcpl-acceptance-duplicate";
    document.body.append(duplicate);
  });
  await admin.getByLabel("Plain-text content", { exact: true }).click();
  await title.click();
  assert.equal(
    await panel.getByRole("article").count(),
    before,
    "Ambiguous target must not compose.",
  );
  assert.match(
    await panel.getByRole("alert").innerText(),
    /ambiguous or unavailable/,
  );
  await page
    .locator("#mcpl-acceptance-duplicate")
    .evaluate((element) => element.remove());
  await admin.getByLabel("Plain-text content", { exact: true }).click();
  await title.click();
  assert.equal(await panel.getByRole("article").count(), before + 1);
  assert.equal(
    await panel.getByRole("alert").count(),
    0,
    "A successful composition clears the resolved diagnostic.",
  );
  await title.fill("private-input-must-not-be-pooled");
  assert.ok(
    !(await panel.innerText()).includes("private-input-must-not-be-pooled"),
  );
  await page
    .getByLabel("Password field (content never collected)", { exact: true })
    .fill("private-password-must-not-be-pooled");
  assert.match(
    await panel.getByText(/^Last native signal:/).innerText(),
    /on ui\.events\.editor\.title\.$/,
    "Only the previous non-sensitive field may publish its blur/change metadata.",
  );
  assert.ok(
    !(await panel.innerText()).includes("private-password-must-not-be-pooled"),
  );
  await panel
    .getByRole("button", { name: "Stop and clear", exact: true })
    .click();
  assert.equal(await panel.getByRole("article").count(), 0);
  await title.click();
  assert.equal(
    await panel.getByRole("article").count(),
    0,
    "Stopped observation must not compose.",
  );
  const proposal = JSON.parse(
    await panel.getByLabel("MCPL recipe JSON").inputValue(),
  );
  proposal.origin = "ai-proposal";
  proposal.label = "UnbrokenLabel".repeat(12);
  proposal.output.title = [{ literal: "<img src=not-executed>" }];
  await panel.getByLabel("MCPL recipe JSON").fill(JSON.stringify(proposal));
  await panel
    .getByRole("button", { name: "Start observing recipe", exact: true })
    .click();
  await title.click();
  await panel.getByRole("article").first().waitFor();
  assert.equal(
    await panel.getByRole("article").first().getByRole("heading").innerText(),
    "<img src=not-executed>",
    "Composed markup must remain plain text.",
  );
  assert.equal(await panel.getByRole("article").locator("img").count(), 0);
  assert.match(
    await panel.getByRole("article").first().innerText(),
    /declared ai-proposal \(unverified\)/,
  );
  await page.setViewportSize({ width: 320, height: 900 });
  const size = await panel.evaluate((element) => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.equal(
    size.width,
    size.scroll,
    "Recipe panel must not overflow at 320px.",
  );
  assert.equal(
    size.viewport,
    size.document,
    "Dashboard must not overflow at 320px.",
  );
  await panel
    .getByRole("button", { name: "Stop and clear", exact: true })
    .click();
  console.log(
    "MCPL acceptance passed: fresh owner login, persisted account content, native focus composition, synthetic/ambiguous-event denial, value privacy, shared AI/operator recipe validation, stop/clear and 320px layout.",
  );
} catch (error) {
  console.error(`MCPL acceptance failed: ${error.message}`);
  if (page) {
    console.error(
      JSON.stringify({
        headings: await page.getByRole("heading").allTextContents(),
        labels: await page.locator("label").allTextContents(),
        alerts: await page.getByRole("alert").allTextContents(),
      }),
    );
  }
  for (const name of containers) {
    try {
      let logs = run("logs", "--tail", "30", name);
      for (const value of secrets) logs = logs.replaceAll(value, "[redacted]");
      console.error(`Isolated ${name} diagnostics:\n${logs}`);
    } catch (failure) {
      console.error(`MCPL diagnostics unavailable: ${failure.message}`);
    }
  }
  process.exitCode = 1;
} finally {
  try {
    if (browser) await browser.close();
  } catch (error) {
    console.error(`MCPL browser cleanup failed: ${error.message}`);
    process.exitCode = 1;
  }
  for (const name of containers.reverse()) {
    try {
      run("rm", "-f", "-v", name);
    } catch (error) {
      console.error(`MCPL container cleanup failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
  try {
    rmSync(directory, { recursive: true });
  } catch (error) {
    console.error(`MCPL temporary config cleanup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
