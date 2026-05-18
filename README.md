# DTM Meal Signup

First-run React/Firebase prototype for the DTM class meal signup flow.

Live meal signup: https://dtm-meal-signup.web.app
Live reimbursement request: https://dtm-meal-signup.web.app/reimbursement
Live admin: https://dtm-meal-signup.web.app/admin
GitHub Pages mirror, after repo setup: https://timorningstar.github.io/dtm-meal-signup/

## Run it

```bash
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://127.0.0.1:5173/`.

## Included in this prototype

- Downtown Ministries-branded signup page
- Campus cards for Goshen, Elkhart, and Middlebury
- Campus-specific available dates and drop-off times
- Claimed-date behavior backed by Firebase when deployed
- Multi-date selection
- Contact, text-reminder, group, notes, and meal fields
- Live signup summary before submit
- Transactional Firebase signup endpoint that prevents double-booking
- Queued Postmark email confirmations/reminders
- Queued Twilio text confirmations/reminders when text reminders are selected
- Companion reimbursement request page
- Firebase Function PDF packet generation
- Pending reimbursement PDFs and receipt images saved to Firebase Storage when Storage is enabled
- Firestore file fallback while Firebase Storage is not initialized
- Password-protected meal signup admin area
- Location/date editor with class name, meal time, expected meal count, and printable schedule filters
- Role-based admin access for full, schedule, accounting, and ALF recovery accounts
- Accounting reimbursement request table with one-hour signed download links when Firebase Storage is enabled
- Recovery full-admin reset account limited to the admin account screen

## Firebase

This app deploys to the existing `dtmcleaners` Firebase project.

- Hosting site: `dtm-meal-signup`
- Public directory: `dist`
- State app id: `mealSignup`
- API rewrite: `/api/**` to the shared `api` Cloud Function
- Firestore document: `appState/mealSignup`
- Reimbursement records: `reimbursementRequests/{requestId}`
- Reimbursement files: `reimbursements/pending/{requestId}/`
  - Current fallback if Storage is not enabled: `reimbursementRequests/{requestId}/files/{fileId}/chunks/{chunkId}`

Firebase Storage still needs to be initialized in the Firebase console for the
preferred folder storage path:

https://console.firebase.google.com/project/dtmcleaners/storage

The Firebase CLI cannot complete this first-time Storage setup for this project;
the console must be opened and "Get Started" must be clicked once. After that,
deploy the storage rules:

```bash
npx firebase-tools deploy --only storage --project dtmcleaners
```

## Admin

Admin URL: https://dtm-meal-signup.web.app/admin

Default main full-admin:

- Login: `admin`
- Password: `fair2026`

Recovery full-admin:

- Login: `ALF`
- Password: `GreenTree53`

Recovery access can only reset the main full-admin account. It cannot manage
schedules, role admins, reimbursements, or demo data. Its reset action is logged
as `ALF` in the change log.

Full admins can create schedule, accounting, or additional full-admin accounts.
Schedule admins can maintain class dates and meal information and view/print the
meal schedule with meal preparer information. Accounting admins can view/print
the meal schedule and review reimbursement requests.

Deploy:

```bash
npm run firebase:deploy
```

Important: the source is now meal-only, but the current live Firebase project
still has DriveWise using the original shared `api` function until DriveWise gets
its own function/rewrite. Do not deploy this repo's functions to Firebase until
that DriveWise backend split is complete.

## GitHub

The repository is prepared for `timorningstar/dtm-meal-signup`.

```bash
git remote add origin https://github.com/timorningstar/dtm-meal-signup.git
git push -u origin main
```

GitHub Pages is configured through `.github/workflows/pages.yml`. The Pages
build uses the Firebase-hosted API at `https://dtm-meal-signup.web.app`, so the
GitHub mirror can run without Cloud Functions on GitHub.

## Next build step

Remove the remaining legacy fair-volunteer helper code once the meal signup
function no longer shares any history with the older volunteer apps.
