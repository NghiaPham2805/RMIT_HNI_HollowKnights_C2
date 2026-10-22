# Blind Portfolio Review — TideCloak Hackathon Prototype

A decentralized, privacy-preserving portfolio review platform powered by **TideCloak** and **Next.js 16 (App Router)**. Reviewers score candidate submissions strictly on their work while identity fields (Name, Email, Institution) remain cryptographically sealed under the Tide tag `"identity"`.

Decryption authorization is **cryptographically enforced at the IAM & threshold enclave level** via realm role grants (`_tide_identity.selfdecrypt`), eliminating application-server trust and UI-only concealment.

---

## Architecture & Security Highlights

1. **Client-Side Zero-Knowledge Encryption**:
   - In `/apply`, identity fields are serialized and encrypted client-side using `doEncrypt([{ data, tags: ["identity"] }])`.
   - The application server only ever stores **ciphertext** in `data/portfolios.json`. The server never possesses keys or plaintext identities.
2. **Cryptographic Stage Transitions**:
   - Moving from Stage 1/2 (*Blind Review*) to Stage 3 (*Reveal*) is **not** an insecure UI flag toggle.
   - The actual ability to unblind applicants requires the administrator to grant the realm role `_tide_identity.selfdecrypt` in TideCloak. Without this role, calls to `doDecrypt` immediately fail.
3. **No Admin Privileges on App Server**:
   - The Next.js application server has no administrative API keys to grant roles, preventing server compromise from compromising candidate privacy.

---

## Routes

* **`/`**: Landing & Login page via TideCloak.
* **`/apply`**: Applicant portal with single-submission form + **"Load 5 Synthetic Applicants"** button.
* **`/review`**: Reviewer portal with blind candidate evaluation, criteria scoring (Code Quality, Design Reasoning, Testing), stage selector, and a real **"Try to reveal identity"** button that never fakes failure.
* **`/reveal`**: Hiring Lead portal to unblind shortlisted candidates once authorized via TideCloak.
* **`/test`**: Diagnostic page proving client-side tag encryption and decryption with session introspection.

---

## Manual TideCloak Setup (Admin Console)

Connect to your TideCloak Admin Console at `http://localhost:8080/admin` (Realm: `nextjs-test`):

### 1. Ensure Roles Exist
* **Realm Roles**:
  * `_tide_identity.selfencrypt`
  * `_tide_identity.selfdecrypt`
* **Client Roles (on `myclient`)**:
  * `applicant`
  * `reviewer`
  * `hiring-lead`

### 2. Configure Users
| User | Client Role (`myclient`) | Initial Realm Role | Description |
| :--- | :--- | :--- | :--- |
| **`applicant1`** | `applicant` | `_tide_identity.selfencrypt` | Submits portfolio & encrypts identity |
| **`reviewer1`** | `reviewer` | *(None or standard `appUser`)* | Reviews & scores blind portfolios |
| **`lead1`** | `hiring-lead` | *(No decrypt role initially)* | Hiring lead awaiting unblinding authorization |

---

## 3-Minute Demo Script

### Act 1: Applicant Submissions (`/apply`)
1. Log in as `applicant1`.
2. Navigate to `http://localhost:3000/apply`.
3. Click **"Load 5 Synthetic Applicants"**.
4. 5 portfolios are generated. Their names, emails, and universities are encrypted client-side with tag `"identity"` and stored into `data/portfolios.json`. Inspect `data/portfolios.json` to confirm only ciphertext is stored.
5. Click **Log out**.

### Act 2: Blind Review & Failed Reveal Attempt (`/review`)
1. Log in as `reviewer1` (holds `reviewer` client role, NO `_tide_identity.selfdecrypt`).
2. Navigate to `http://localhost:3000/review`.
3. Inspect candidate submissions: project titles, descriptions, and criteria scoring are visible.
4. Click **"🔓 Try to reveal identity"** on any candidate.
5. **Observation**: Decryption fails with the real Tide authorization error (`User has not been given any access to 'identity'`). The UI does **not** fake this — TideCloak cryptographically blocks access.
6. Submit a score (e.g. 9, 8, 9) and notes.
7. Click **Log out**.

### Act 3: Hiring Lead Denied (`/reveal`)
1. Log in as `lead1` (client role `hiring-lead`, initially NO `_tide_identity.selfdecrypt`).
2. Navigate to `http://localhost:3000/reveal`.
3. Click **"Reveal Candidate Identity"**.
4. **Observation**: Even the hiring lead is denied decryption because the role has not been granted.

### Act 4: Stage 3 Reveal Authorization (The "Unlock")
1. In TideCloak Admin Console (`http://localhost:8080`), go to **Users** -> `lead1` -> **Role mapping**.
2. Assign realm role: **`_tide_identity.selfdecrypt`**.
3. In the app, have `lead1` **log out and log back in** (to receive the updated token claim).
4. Return to `http://localhost:3000/reveal`.
5. Click **"🔓 Reveal All Shortlisted Identities"**.
6. **Result**: All candidate identities (Alex Rivera, Priya Sharma, Lucas Dupont, etc.) decrypt instantly!

