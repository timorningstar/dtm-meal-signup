# DTM Class Meals - Short Developer Manual

Last updated: June 27, 2026

## Access and URLs

- Production meal signup: https://dtm-meal-signup.web.app/
- Reimbursement request: https://dtm-meal-signup.web.app/reimbursement
- Admin dashboard: https://dtm-meal-signup.web.app/admin
- GitHub repository: https://github.com/timorningstar/dtm-meal-signup
- GitHub Pages mirror: https://timorningstar.github.io/dtm-meal-signup/
- Firebase console: https://console.firebase.google.com/project/dtmcleaners/overview
- Postmark: https://account.postmarkapp.com/
- Twilio: https://console.twilio.com/

The Firebase-hosted site is the production app. The GitHub Pages site is a
mirror that sends API requests to the Firebase-hosted backend.

## Accounts

- GitHub owner: `timorningstar`
- Firebase project access: Google account `tmstar353@gmail.com`
- Main meal admin: the current login name is shown under **Admin Accounts** in
  the admin dashboard. The original seeded login name was `admin`.
- Recovery admin login name: `ALF`. This account can only reset the main
  full-admin account.

Keep the current main-admin password, recovery password, Postmark credentials,
Twilio credentials, and Google account recovery information in the
organization's password manager. Do not add live passwords or provider tokens
to this repository. If the main admin password is lost, use `ALF` at the admin
URL and reset the main account.

## Admin Roles

- `full`: all schedule, reminder, reimbursement, and admin-account functions.
- `schedule`: manage locations, meal dates, preparers, and reminders; view and
  print the schedule.
- `accounting`: view, print, download, complete, and review reimbursement
  requests.
- `recovery`: reset the main full-admin account only.

Admin sessions expire after 12 hours. Additional admins are created under
**Admin Accounts**. Newly created additional full admins must change their
temporary password at first login.

## Technology and Services

- Frontend: React 19 and Vite 8
- Backend: Firebase Cloud Functions for Node.js 24
- Database: Cloud Firestore
- File storage: Firebase Storage, with a Firestore fallback for reimbursement
  files if the Storage bucket is unavailable
- Email: Postmark
- Text messages: Twilio
- PDF generation: PDFKit
- Source control and mirror hosting: GitHub and GitHub Pages

Firebase identifiers:

- Project: `dtmcleaners`
- Hosting site: `dtm-meal-signup`
- Functions codebase: `meal-signup`
- HTTPS function: `mealApi`
- Scheduled function: `mealSendQueuedMessages` (runs every five minutes)
- Storage bucket: `dtmcleaners.appspot.com`
- State application ID: `mealSignup`

## Main Features

- Public meal signup with location, month, class, frequency, and available-date
  selection
- Duplicate-booking protection in a Firestore transaction
- Optional SMS consent and scheduled email/text reminders
- Admin schedule filters, location/date setup, recurring dates, offline-filled
  dates, preparer removal, and full-admin history overrides
- Private reimbursement access through a 24-hour email link
- Receipt upload and reimbursement PDF packet creation
- Accounting queues for pending and completed requests
- Full-admin deletion of test reimbursement requests
- Role-based admin dashboard and change log

Meal confirmations BCC `volunteer@downtownmin.org`. New reimbursement
notifications go to both `volunteer@downtownmin.org` and
`accounting@downtownmin.org`.

## Firestore and Files

Important Firestore locations:

- `appState/mealSignup`: locations, meal dates, signups, message queues,
  templates, admins, and change log
- `reimbursementRequests/{requestId}`: reimbursement records and file metadata
- `reimbursementLinks/{tokenHash}`: expiring private reimbursement links
- `adminSessions/{tokenHash}`: expiring admin sessions

Reimbursement files normally use:

`reimbursements/pending/{requestId}/`

Do not directly edit Firestore unless the admin tools cannot perform the task.
Export or back up data before any manual bulk correction.

## Secrets

The Cloud Functions use these Firebase secrets:

- `POSTMARK_SERVER_TOKEN`
- `POSTMARK_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Inspect secret names or add a new version with Firebase CLI. Never print secret
values into logs or documentation.

## Local Development

Repository location on the original development computer:

`C:\Users\timmo\Documents\Codex\dtm-meal-signup`

```powershell
cd C:\Users\timmo\Documents\Codex\dtm-meal-signup
npm install
cd functions
npm install
cd ..
npm run dev
```

Vite usually opens the app at `http://127.0.0.1:5173/`.

Before deployment:

```powershell
npm run lint
npm run build
node -e "require('./functions')"
```

## Deployment

Sign in when necessary:

```powershell
npx firebase-tools login
```

Deploy the production frontend and its backend together:

```powershell
npx firebase-tools deploy --only hosting:dtm-meal-signup,functions:meal-signup --project dtmcleaners
```

Deploy only the frontend:

```powershell
npx firebase-tools deploy --only hosting:dtm-meal-signup --project dtmcleaners
```

Deploy Firestore or Storage rules after changing them:

```powershell
npx firebase-tools deploy --only firestore:rules,storage --project dtmcleaners
```

Pushing `main` to GitHub automatically rebuilds the GitHub Pages mirror through
`.github/workflows/pages.yml`. A GitHub Pages success does not deploy Firebase.

## Routine Checks

After a release, verify:

1. Public dates load and a claimed date is unavailable.
2. Admin login works and each role sees only its permitted tabs.
3. A confirmation email arrives and is BCC'd correctly.
4. The reimbursement email link shows only that provider's unreimbursed meals.
5. Receipt files and the generated PDF open from Accounting.
6. Completed reimbursements no longer appear as available for a new request.

For backend errors, review Cloud Functions logs in the Firebase console or run:

```powershell
npx firebase-tools functions:log --project dtmcleaners
```

## Recovery Notes

- Lost main-admin password: sign in as `ALF`, reset the main account, then log
  out and use the new temporary password.
- Failed email: check Postmark activity, Firebase function logs, sender
  verification, and the two Postmark secrets.
- Failed SMS: check Twilio logs, consent, phone formatting, account balance, and
  the three Twilio secrets.
- Missing receipt/PDF: check the Firebase Storage bucket first, then the
  reimbursement request's Firestore `files` fallback.
- Bad release: use Git history to identify the last good commit, correct the
  code, test, and redeploy. Do not delete production Firestore data as a release
  rollback.
