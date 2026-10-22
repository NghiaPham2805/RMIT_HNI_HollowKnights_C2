# BlindPortfolio — Bias-Free Hiring with Decentralized Confidentiality

[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

BlindPortfolio is a cryptographically-enforced blind review platform where candidate identities are sealed in browser-side threshold encryption so that reviewers evaluate engineering portfolios purely on merit — and no one can cheat.

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

BlindPortfolio reimagines technical hiring as a **cryptographically blind process**. When a candidate submits their portfolio, their name, email, and university are encrypted directly inside the browser using TideCloak's tag-based threshold cryptography — the application server never sees the plaintext. Reviewers score projects on code quality, architecture reasoning, and test depth without any possibility of identity bias. Only after a formal authorization ceremony in the TideCloak Admin Console can a hiring lead decrypt and reveal the shortlisted identities.

What makes this distinctive is that the blindness is not a UI-level mask that a curious developer, database admin, or attacker could bypass. It is **hardware-enclave-enforced, zero-knowledge confidentiality** — the server literally cannot reveal what it does not possess.

### 2. Trust constraint insight

Today, "blind hiring" in most platforms means hiding a name behind a toggle or storing plaintext in a database that any privileged insider can query. This creates a fundamental trust problem: organizations must trust their own infrastructure, DBAs, and every developer with production access to not peek. In practice, that trust is routinely violated — studies show unconscious bias persists even with good intentions, and data breaches expose candidate PII regularly.

With BlindPortfolio, **the trust constraint is removed entirely**. The application server stores only ciphertext for identity fields. Even a full database dump reveals nothing. Decryption keys are never held by any single party — they are split across Tide's decentralized Orchestrated Recryptors (ORKs). Unblinding requires an explicit IAM role grant (`_tide_identity.selfdecrypt`) by an administrator, turning a social/policy decision into a cryptographic gate. This makes truly bias-free evaluation not just aspirational, but mathematically guaranteed.

### 3. Value & impact

**Candidates** benefit because their work is evaluated on its own merits. A student from a lesser-known university presenting exceptional distributed systems work gets the same shot as an Ivy League applicant — no name, no school, no unconscious bias.

**Hiring teams** benefit because they can demonstrate to regulators, candidates, and the public that their process is provably fair — not just policy-fair, but cryptography-fair.

**Concrete example:** A scholarship committee reviewing 50 engineering portfolios can use BlindPortfolio to ensure every reviewer scores projects without knowing whether the applicant is from MIT or a community college. When the shortlist is finalized, the committee chair requests the administrator to grant the reveal role. Only then do the top candidates' identities appear — and there is a full cryptographic audit trail proving the scores were submitted before any identity was visible.

### 4. Why TideCloak matters

TideCloak is what makes the "blind" in BlindPortfolio real rather than cosmetic:

- **Client-side tag-based encryption** (`doEncrypt` with tag `"identity"`): Identity fields are encrypted in the applicant's browser before any network request. The server API receives and stores only base64 ciphertext. There are no server-side keys to steal.
- **Role-gated decryption** (`_tide_identity.selfdecrypt`): The ability to call `doDecrypt` is not controlled by application code — it is enforced by TideCloak's IAM and the Tide Cybersecurity Fabric. Without the realm role, the decryption call fails at the enclave level, not at a UI check.
- **Threshold cryptography via ORKs**: Decryption keys are split across decentralized Orchestrated Recryptors. No single node, server, or admin can unilaterally decrypt. This eliminates single points of compromise.
- **Separation of concerns**: The Next.js application has zero administrative API keys. Even if the app server is fully compromised, candidate identities remain sealed.

### 5. Prototype & storytelling

The prototype demonstrates a complete 3-act hiring workflow:

1. **Act 1 — Candidate Submission** (`/apply`): An applicant (or the demo's "Seed 5 Synthetic Applicants" button) encrypts identity fields client-side and submits a technical portfolio. Judges can inspect `data/portfolios.json` to confirm only ciphertext is stored.

2. **Act 2 — Blind Review** (`/review`): A reviewer sees project titles, architecture descriptions, and scoring criteria — but identity is sealed behind a lock icon. Clicking "Try to reveal identity" produces a real TideCloak authorization denial (not a fake UI error). The reviewer submits merit-based scores.

3. **Act 3 — Authorized Reveal** (`/reveal`): The hiring lead initially cannot decrypt either. After the administrator grants `_tide_identity.selfdecrypt` in the TideCloak Admin Console and the lead re-authenticates, clicking "Reveal All Shortlisted Identities" instantly decrypts every candidate — proving the cryptographic gate works.

**Key interaction for judges:** Watch the transition from Act 2 (real decryption failure) to Act 3 (successful decryption) — the only thing that changed was a role grant in TideCloak, not any application code or database update.

## Setup

### Prerequisites

- **Docker** (for running TideCloak)
- **Node.js** 18+ and **npm**
- **Bash** (Git Bash on Windows), **curl**, **jq**

### 1. Start TideCloak

```bash
docker run -d --name tidecloak -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=password \
  tideorg/tidecloak:latest
```

Wait until TideCloak is healthy (`http://localhost:8080`).

### 2. Initialize the realm

```bash
cd my-app
npm install
npm run init        # runs bash init/tcinit.sh
```

Follow the on-screen prompt to complete Tide enrollment in your browser when the enrollment link appears.

### 3. Configure users in TideCloak Admin Console

Open `http://localhost:8080/admin` (Realm: `nextjs-test`) and create the demo users:

| User | Client Role (`myclient`) | Realm Role | Purpose |
| :--- | :--- | :--- | :--- |
| `applicant1` | `applicant` | `_tide_identity.selfencrypt` | Submits & encrypts portfolios |
| `reviewer1` | `reviewer` | *(none)* | Blind review & scoring |
| `lead1` | `hiring-lead` | *(none initially)* | Reveal after authorization |

### 4. Run the app

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 5. Demo walkthrough

1. **Log in as `applicant1`** → go to `/apply` → click **"Seed 5 Synthetic Applicants"** → log out.
2. **Log in as `reviewer1`** → go to `/review` → try "Reveal identity" (fails cryptographically) → score candidates → log out.
3. **Log in as `lead1`** → go to `/reveal` → try "Reveal All" (fails — no decrypt role yet).
4. **In TideCloak Admin Console:** assign `_tide_identity.selfdecrypt` to `lead1`.
5. **Log `lead1` out and back in** → go to `/reveal` → click "Reveal All" → identities decrypt instantly.

### Routes

| Route | Description |
| :--- | :--- |
| `/` | Landing & login |
| `/home` | Overview dashboard |
| `/apply` | Candidate submission portal |
| `/review` | Blind reviewer board with scoring |
| `/reveal` | Hiring lead identity reveal console |
| `/test` | Encryption/decryption diagnostic page |

### Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **@tidecloak/nextjs** SDK for client-side tag-based encryption/decryption
- **TideCloak** IAM with threshold cryptography via the Tide Cybersecurity Fabric
