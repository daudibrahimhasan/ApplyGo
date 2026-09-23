# GroundedApply

**GroundedApply** is a production-grade Chromium browser extension (Manifest V3) built to assist applicants completing AI safety job applications, research fellowships, internships, scholarships, conferences, research programs, grants, accelerators, and general opportunity applications.

It operates under strict architectural separation between a **deterministic form engine** and a **grounded AI writing assistant**.

---

## 1. Product Overview & Core Philosophy

Filling out multi-page technical applications involves two completely different tasks:
1. **Entering structured facts** (names, emails, phone numbers, degrees, GPAs, links, work authorization). This must be **100% deterministic, exact, safe, and verifiable**. AI should never touch these.
2. **Drafting written responses** (research statements, project narratives, motivation essays). This requires natural language synthesis that is **strictly grounded** in your actual verified experiences, without hallucinations, sales hype, or inflated claims.

### The Non-Negotiable Boundaries
- **Deterministic Form Engine**: Owns scanning visible controls, calculating weighted confidence, verifying filled values, managing atomic undo, and blocking sensitive fields.
- **AI Writing Assistant**: Used solely for drafting, shortening, expanding, and adapting written answers for Daud. It is **never** permitted to interact with the DOM, press buttons, choose targets, fill structured fields, or submit forms.
- **Zero Auto-Submission**: GroundedApply will **never** submit a form or click "Submit" / "Apply". The final review and submission always remain in your hands.

---

## 2. Supported Platforms & Form Systems

GroundedApply features dedicated platform adapters and universal heuristics:
- **Standard HTML5 Forms**: Native forms, custom semantic form-groups, accessible inputs, textareas, selects, and comboboxes.
- **Google Forms**: `.geS5n`, `[role="listitem"]`, multi-page forms, and custom radio/checkbox grids.
- **Greenhouse**: Boards (`boards.greenhouse.io`, `#application_form`, nested question attributes).
- **Lever**: Lever jobs (`jobs.lever.co`, `.application-form`, custom question cards).
- **Ashby**: Ashby applications (`[data-ashby-input]`, custom comboboxes).
- **Workable**: Workable boards (`apply.workable.com`, `[data-ui="application-form"]`).
- **SmartRecruiters**: `st-apply`, `oc-form` widgets.
- **Fillout**: Dynamic multi-step forms.
- **Typeform**: Conversational step-by-step forms.
- **Workday**: Best-effort structured detection and review fallback.

---

## 3. Honest Limitations

- **Browser Security Boundaries**: File inputs (`<input type="file">`) cannot have synthetic local file paths attached without native OS file picker interaction in standard Web APIs due to browser security restrictions. GroundedApply detects resume file inputs, guides you to select your stored resume, and copies references cleanly.
- **Custom Canvas/WebGL Elements**: Forms rendered inside `<canvas>` or non-DOM WebGL interfaces cannot be inspected or filled.
- **CAPTCHAs & Turnstile**: Bot detection puzzles (reCAPTCHA, Cloudflare Turnstile, hCaptcha) are intentionally ignored and must be solved manually.
- **Demographic Fields**: Questions concerning race, ethnicity, gender, and veteran status are blocked from automatic autofill and held for manual inspection.

---

## 4. Privacy & BYOK Architecture

- **100% Local-First**: No external backend servers, telemetry, tracking pixels, or third-party cookies.
- **Bring-Your-Own-Key (BYOK)**: Supports OpenAI or any OpenAI-compatible API endpoint (e.g. self-hosted, Ollama, OpenRouter).
- **Storage Isolation**: The API key is stored in Chromium extension storage and used **only** from the background service worker. It is never exposed to web pages or content scripts.
- **Minimal Context**: The extension never sends full-page HTML to the AI model. Only the isolated question text and your explicitly selected knowledge records are sent.
- *Security Note*: Local extension storage is suitable for personal BYOK use but is not equivalent to hardware-backed secure enclaves (HSM/TPM).

---

## 5. Permissions Rationale

| Permission | Justification |
| :--- | :--- |
| `activeTab` | Access the active web page when user invokes the extension to detect form controls. |
| `storage` | Persist profile data, grounded knowledge, application history, and preferences locally. |
| `sidePanel` | Display the 5-tab GroundedApply application interface in Chrome's side panel. |
| `scripting` | Inject form filler scripts and safe input listeners into form frames. |

---

## 6. Installation & Load Unpacked

### Prerequisites
- Node.js (v18+) and npm.
- Google Chrome or any Chromium-based browser (Brave, Edge).

### Build from Source
```bash
# Clone the repository and navigate into it
cd form-FILL

# Install dependencies
npm install

# Run tests
npm test

# Build production unpacked extension
npm run build
```

### Loading Unpacked in Chrome
1. Open Google Chrome and navigate to: `chrome://extensions`
2. Enable **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `dist/` directory inside `form-FILL`.
5. Pin the **GroundedApply** icon to your toolbar.

---

## 7. Configuration & Getting Started

1. **Open Settings**: Click the GroundedApply icon or click the gear icon in the side panel header.
2. **Enter API Key**:
   - Provide your OpenAI API key (`sk-...`).
   - (Optional) Customize the model name (default: `gpt-4o`) or Base URL for third-party endpoints.
   - Click **Test Connection** to verify endpoint availability.
3. **Verify Profile & Knowledge**:
   - Open the **Profile** tab to review personal, education, employment, and research records.
   - Open the **Knowledge** tab to inspect and customize verified factual records about your AI safety work, projects (e.g. `AgentContain`), and unlearning experiments.
4. **Apply on Opportunity Pages**:
   - Navigate to any job application or fellowship form.
   - Click the floating GroundedApply launcher or open the Side Panel.
   - Click **Fill safe fields** to autofill high-confidence fields instantly.
   - Switch to **Questions** to generate grounded written answers.

---

## 8. Development & Testing Commands

```bash
# Start Vite development server
npm run dev

# Run unit and integration tests (Vitest)
npm test

# Run End-to-End browser tests (Playwright)
npm run test:e2e

# Run TypeScript type check
npx tsc --noEmit

# Package and verify release bundle
npm run package
```

---

## 9. Data Portability (Import & Export)

- **Backup JSON**: In Settings, click **Export Backup JSON** to download a single file containing your full profile, knowledge repository, previous answers, and application activity.
- **Restore**: Click **Import Backup JSON** to restore your data onto any computer.
- **Wipe All**: Click **Delete All Stored Data** in Settings to clear all local storage completely.
