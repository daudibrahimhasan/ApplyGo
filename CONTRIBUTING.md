# Contributing to ApplyGo

ApplyGo separates two jobs: filling known facts locally and using AI to draft written answers. Contributions should keep that separation intact.

Form compatibility fixes, better knowledge-base imports, clearer review states, accessibility improvements, and reliable provider handling are especially useful. Small, tested changes are easier to review than broad rewrites.

## Getting started

Fork the repository, clone your fork, and create a branch for your change.

```sh
git clone https://github.com/YOUR_USERNAME/ApplyGo.git
cd ApplyGo
git switch -c fix/your-change
npm ci
npx playwright install chromium
npm run build
```

Load `dist` as an unpacked extension at `chrome://extensions` with Developer mode enabled. After rebuilding, reload the extension and refresh the form page. An already-injected launcher may still be connected to the previous build.

Use fictional candidate data. [sample-knowledge.md](tests/fixtures/sample-knowledge.md) is a starting point. You do not need a real API key to run the automated test suite; browser tests mock writing responses where needed.

## Reporting a bug

Open an issue with:

- What you expected and what actually happened.
- Your browser version and the form platform, if known.
- Steps to reproduce it, including whether you reloaded the extension and page.
- Whether the problem is detection, profile extraction, filling, or AI generation.
- A minimal HTML fixture or a public example form, when possible.
- Relevant error text and a redacted screenshot.

Do not include API keys, private form links, real application answers, personal knowledge bases, resumes, browser profiles, or unredacted backups. An HTTP error can usually be reported with its status and sanitized message instead of the full request.

For a suspected security issue, do not post secrets or exploit details publicly. Use GitHub's private vulnerability reporting if it is enabled. Otherwise, ask for a private reporting channel without disclosing the vulnerability.

## Implementation boundaries

- **Structured facts stay deterministic.** Name, email, links, dates, eligibility, and other profile facts must come from explicit saved information. Do not ask the model to guess missing facts.
- **AI only proposes written responses.** The model must not control the browser, select DOM targets, decide eligibility, or submit applications. Keep grounding and output validation in place.
- **Submission stays manual.** Do not add automatic submission, CAPTCHA bypasses, or automatic legal consent.
- **Respect existing values.** Preserve the user's answers unless an explicit action permits replacing them. Verify inserted values and preserve undo behavior where supported.
- **Missing information is a review state.** A blank profile value should not become an invented answer or a misleading success message.
- **Protect stored data.** Validate imports and saves. Keep existing storage keys compatible, or provide and test a migration. Invalid entries must not erase unrelated valid profile facts.
- **Keep private context private.** Do not add telemetry, new external requests, or broader permissions without explaining the need and privacy impact in the pull request.
- **Do not weaken the writing rules casually.** Changes to the runtime system prompt need a clear reason, examples, and checks for unsupported claims.

## Testing your change

Run the relevant focused tests while developing. Before opening a pull request, run:

```sh
npm test
npm run build
npm run test:e2e
npm run lint
npm run package
```

Report failures or existing warnings honestly. A build alone does not prove that a form can be filled.

### Form detection and filling

Add a non-private fixture under `tests/fixtures` and an appropriate unit, integration, or browser test. Check both the extracted label and the actual field value after insertion. Useful cases include:

- Native labels and multiple ARIA label references.
- Nested question containers and accessible custom controls.
- Dynamic fields revealed after the initial scan.
- Missing profile values, disabled controls, and existing answers.
- Sensitive fields and legal consent remaining untouched.

Platform recognition alone is not evidence of working autofill. Do not claim a platform is fully supported based only on its URL or title detection. Never submit a real application during testing.

### AI provider changes

Use mocks for automated tests. Cover failures as well as successful text: timeouts, rate limits, unavailable models, malformed responses, and responses with no usable answer. Local basic autofill must still work when the provider fails. Do not make paid requests as part of the default tests.

### UI changes

Check the narrow side-panel layout, keyboard navigation, focus states, readable contrast, and loading, empty, and error states. Include before/after screenshots for visible changes, using fictional data.

The README screenshot can be recreated from the built extension:

```sh
npm run build
node scripts/capture-ui.js
```

It should remain an actual 1280 × 720 UI capture, not a mockup presented as a working product.

## Pull request checklist

- Explain the problem, the change, and any limits that remain.
- Keep the change focused; avoid unrelated refactors or formatting churn.
- Add regression coverage for bugs and new behavior.
- List the checks you ran and their results.
- Update documentation if setup, behavior, permissions, or compatibility changed.
- Include sanitized screenshots for visible changes.
- Confirm no keys, personal documents, backups, or generated browser profiles are included.
- Call out dependency additions, permission changes, and storage migrations explicitly.

You can open a draft pull request if the approach needs discussion. For a large feature or architectural change, open an issue first so the scope can be agreed before implementation.
