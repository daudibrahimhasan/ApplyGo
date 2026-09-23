# GroundedApply - Privacy Policy & Data Architecture

## 1. Local-First Architecture
GroundedApply is designed for personal, local-first use:
- **No Third-Party Analytics**: No telemetry, tracking pixels, tracking cookies, or analytics scripts.
- **No External Backend**: GroundedApply operates without a hosted server or proprietary cloud service.
- **Local Storage**: All profile data, resumes, knowledge entries, activity logs, and previous answers are stored exclusively in your browser's `chrome.storage.local` and IndexedDB.

## 2. Bring-Your-Own-Key (BYOK) AI Provider
- The extension communicates directly with your chosen OpenAI-compatible API endpoint (default: `https://api.openai.com/v1`).
- The API key is stored exclusively in extension-isolated storage (`chrome.storage.local` with `AccessLevel.TRUSTED_AND_UNTRUSTED_CONTEXTS` / restricted to extension background service worker).
- **API keys are NEVER exposed to content scripts, page DOMs, web pages, or console logs.**
- Extension storage is local to your Chromium profile. Note: While protected from web page scripts by Chromium's extension sandbox, local storage is not equivalent to hardware-backed secure enclaves (TPM / HSM).

## 3. Data Transmission Boundaries
- **No DOM Scraping Sent to AI**: The full page HTML or unrelated webpage contents are NEVER sent to the AI model.
- **Minimal Context**: Only the isolated question prompt, its instruction/limits, opportunity metadata, and the user's explicitly selected knowledge entries are sent during generation.
- **Deterministic Autofill is 100% Offline**: Detecting fields, matching profile attributes, and filling form inputs requires zero network calls and works completely offline.

## 4. Permissions Rationale
| Permission | Technical Need |
| :--- | :--- |
| `activeTab` | Access the active web page when user invokes the extension to detect form controls. |
| `storage` | Store profile, knowledge records, application history, and preferences locally. |
| `sidePanel` | Display the 5-tab GroundedApply application interface alongside forms. |
| `scripting` | Inject form filler scripts and safe input listeners into form frames. |

No `history`, `clipboard`, `downloads`, `webRequest`, or background surveillance permissions are requested.
