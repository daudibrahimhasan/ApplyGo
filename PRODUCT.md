# ApplyGo - Product Purpose & Requirements

## 1. Product Purpose
ApplyGo is a Chromium browser extension built to assist applicants (specifically focused on Daud's profile, AI safety job applications, research fellowships, internships, scholarships, conferences, research programs, grants, accelerators, competitions, and general opportunity applications).

It operates under strict architectural boundaries:
1. **Deterministic Form Engine**: Owns page scanning, field detection, classification, profile lookup, exact and normalized matching, dropdown selection, file attachment selection, DOM mutation, React-controlled input handling, filled-value verification, confidence calculation, sensitive-field blocking, undo transactions, page change detection, and multi-page application tracking.
2. **Grounded AI Writing Assistant**: Used solely for drafting written responses and passages. It is strictly forbidden from browser control, target field selection, structured autofill, button clicking, navigation, eligibility decisions, or form submission.

**Never submit an application automatically.**

## 2. Target Platforms & Coverage
The extension provides dedicated platform adapters and universal scanning across:
- Standard HTML forms
- Google Forms
- Greenhouse
- Lever
- Ashby
- Workable
- SmartRecruiters
- Fillout
- Typeform
- Workday (best-effort structured detection and review fallback)

## 3. Core Capabilities
- **Deterministic Autofill**: High-confidence fields can be safely filled with a single click ("Fill safe fields").
- **Review & Match Inspection**: Medium-confidence fields and ambiguous dropdowns are held for review with transparent match reasoning.
- **Atomic Undo**: Every autofill operation records pre-fill values and can restore them completely.
- **Sensitive Field Shield**: Passwords, SSN/ID numbers, payment details, demographic questions, and legal/consent checkboxes are never automatically filled.
- **Grounded AI Drafting**: Written questions are analyzed, paired with relevant user knowledge entries, and sent with a strict system prompt to draft natural, truthful answers reflecting Daud's personal voice.
- **Factual Audit**: AI outputs are validated against supplied knowledge IDs, character/word limits, and checked for unsupported claims or missing information.
- **Data Sovereignty**: 100% local-first, Bring-Your-Own-Key (OpenAI-compatible), local Chrome storage, and full JSON import/export/deletion.
