import { bangs } from "./bang";
import "./global.css";

// Constants
const STORAGE_KEY_DEFAULT_BANG = "default-bang";
const STORAGE_KEY_QUESTION_BANG = "default-question";
const DEFAULT_BANG = "g";
const DEFAULT_QUESTION_BANG = "p";
const CLIPBOARD_RESET_DELAY = 2000;

// Get stored defaults
const storedDefaultBang =
  localStorage.getItem(STORAGE_KEY_DEFAULT_BANG) ?? DEFAULT_BANG;
const storedQuestionBang =
  localStorage.getItem(STORAGE_KEY_QUESTION_BANG) ?? DEFAULT_QUESTION_BANG;

const defaultBang = bangs.find((b) => b.t === storedDefaultBang);
const defaultQuestionBang = bangs.find((b) => b.t === storedQuestionBang);

// UI Rendering
function renderHomePage() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;

  const currentDomain = window.location.origin;
  const currentDefaultBang =
    localStorage.getItem(STORAGE_KEY_DEFAULT_BANG) ?? DEFAULT_BANG;
  const currentQuestionBang =
    localStorage.getItem(STORAGE_KEY_QUESTION_BANG) ?? DEFAULT_QUESTION_BANG;

  app.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
      <div class="content-container">
        <h1>Und*ck</h1>
        <p>DuckDuckGo's bang redirects are too slow. Add the following URL as a custom search engine to your browser. Enables <a href="https://duckduckgo.com/bang.html" target="_blank">all of DuckDuckGo's bangs.</a></p>

        <div class="url-container">
          <input
            type="text"
            class="url-input"
            value="${currentDomain}/?q=%s"
            readonly
          />
          <button class="copy-button">
            <img src="/clipboard.svg" alt="Copy" />
          </button>
        </div>

        <div style="margin-top: 32px; text-align: left; width: 100%;">
          <h2 style="font-size: 18px; margin-bottom: 16px;">Settings</h2>

          <div style="margin-bottom: 16px;">
            <label for="default-bang" style="display: block; margin-bottom: 4px; font-weight: 500;">
              Default Bang (no ?)
            </label>
            <input
              type="text"
              id="default-bang"
              class="url-input"
              value="${currentDefaultBang}"
              placeholder="${DEFAULT_BANG}"
              style="max-width: 200px;"
            />
            <p style="font-size: 14px; color: #666; margin-top: 4px;">
              Used when no ? is in the query
            </p>
          </div>

          <div style="margin-bottom: 16px;">
            <label for="default-question" style="display: block; margin-bottom: 4px; font-weight: 500;">
              Default Question Bang (? with no command)
            </label>
            <input
              type="text"
              id="default-question"
              class="url-input"
              value="${currentQuestionBang}"
              placeholder="${DEFAULT_QUESTION_BANG}"
              style="max-width: 200px;"
            />
            <p style="font-size: 14px; color: #666; margin-top: 4px;">
              Used when query ends with ? but no command
            </p>
          </div>

          <button id="save-settings" style="padding: 8px 16px; background: #007bff; color: white; border-radius: 4px; font-weight: 500;">
            Save Settings
          </button>
          <span id="save-status" style="margin-left: 12px; color: #28a745; font-size: 14px; display: none;">
            Saved!
          </span>
        </div>
      </div>

      <footer class="footer">
        <a href="https://t3.chat" target="_blank">t3.chat</a>
        •
        <a href="https://x.com/theo" target="_blank">theo</a>
        •
        <a href="https://github.com/t3dotgg/unduck" target="_blank">github</a>
      </footer>
    </div>
  `;

  setupCopyButton(app);
  setupSettingsForm(app);
}

function setupCopyButton(app: HTMLDivElement) {
  const copyButton = app.querySelector<HTMLButtonElement>(".copy-button");
  const copyIcon = copyButton?.querySelector("img");
  const urlInput = app.querySelector<HTMLInputElement>(".url-input");

  if (!copyButton || !copyIcon || !urlInput) return;

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(urlInput.value);
    copyIcon.src = "/clipboard-check.svg";

    setTimeout(() => {
      copyIcon.src = "/clipboard.svg";
    }, CLIPBOARD_RESET_DELAY);
  });
}

function setupSettingsForm(app: HTMLDivElement) {
  const saveButton = app.querySelector<HTMLButtonElement>("#save-settings");
  const defaultBangInput = app.querySelector<HTMLInputElement>("#default-bang");
  const defaultQuestionInput =
    app.querySelector<HTMLInputElement>("#default-question");
  const saveStatus = app.querySelector<HTMLSpanElement>("#save-status");

  if (!saveButton || !defaultBangInput || !defaultQuestionInput || !saveStatus)
    return;

  saveButton.addEventListener("click", () => {
    const defaultBangValue = defaultBangInput.value.trim() || DEFAULT_BANG;
    const defaultQuestionValue =
      defaultQuestionInput.value.trim() || DEFAULT_QUESTION_BANG;

    localStorage.setItem(STORAGE_KEY_DEFAULT_BANG, defaultBangValue);
    localStorage.setItem(STORAGE_KEY_QUESTION_BANG, defaultQuestionValue);

    saveStatus.style.display = "inline";
    setTimeout(() => {
      saveStatus.style.display = "none";
    }, CLIPBOARD_RESET_DELAY);
  });
}

// Redirect Logic
function parseQuery(query: string) {
  const match = query.match(/\s*\?(\S*)/i);
  const bangCandidate = match?.[1]?.toLowerCase();

  return { match, bangCandidate };
}

function selectBang(
  match: RegExpMatchArray | null,
  bangCandidate: string | undefined,
) {
  if (match && !bangCandidate) {
    // Query has ? but nothing after it
    return defaultQuestionBang;
  } else if (bangCandidate) {
    // Query has ? with a command
    return bangs.find((b) => b.t === bangCandidate);
  } else {
    // No ? in query at all
    return defaultBang;
  }
}

function cleanQueryString(query: string): string {
  return query.replace(/\s*\?\S*\s*/i, "").trim();
}

function buildSearchUrl(
  selectedBang: (typeof bangs)[0] | undefined,
  cleanQuery: string,
): string | null {
  if (!selectedBang) return null;

  const searchUrl = selectedBang.u.replace(
    "{{{s}}}",
    encodeURIComponent(cleanQuery).replace(/%2F/g, "/"),
  );

  return searchUrl || null;
}

function getRedirectUrl(): string | null {
  const url = new URL(window.location.href);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    renderHomePage();
    return null;
  }

  const { match, bangCandidate } = parseQuery(query);
  const selectedBang = selectBang(match, bangCandidate);
  const cleanQuery = cleanQueryString(query);

  return buildSearchUrl(selectedBang, cleanQuery);
}

function performRedirect() {
  const redirectUrl = getRedirectUrl();
  if (!redirectUrl) return;

  window.location.replace(redirectUrl);
}

// Initialize
performRedirect();
