# Test Cases — Personal Loan Calculator

Page under test: `https://applynow.cimb.com.my/eform-app/loans/calculator?action=calc&language=en`

Every rule below was checked against the live page before writing the corresponding test - none
of this is assumed from reading the markup. IDs here match the test titles in the code and the
rows in `CIMB_Loan_Calculator_Test_Cases.xlsx` one-to-one. Implemented across
`tests/specs/loanCalculator.validation.spec.js` (field-level, TC001–TC028),
`tests/specs/loanCalculator.e2e.spec.js` (end-to-end scenario, TC029), and
`tests/specs/loanCalculator.language.spec.js` (EN/BM toggle, TC030–TC032).

| ID | Area | Scenario | Input | Expected Result |
|----|------|----------|-------|------------------|
| TC001 | Page load | Calculator page loads | N/A | Title is "Cash Plus Personal Loan"; Income, Loan Amount, Tenure fields visible; Income="0.00", Loan Amount="0", Tenure has no selection; Next button disabled |
| TC002 | Gross Monthly Income | Required field | Focus then blur, leave empty | Error: "Minimum gross monthly income is MYR 2,000."; Next stays disabled |
| TC003 | Gross Monthly Income | Below minimum | 1,999 | Error: "Minimum gross monthly income is MYR 2,000." |
| TC004 | Gross Monthly Income | At minimum boundary | 2,000 | No error (accepted) |
| TC005 | Gross Monthly Income | Above minimum | 2,001 | No error (accepted) |
| TC006 | Cross-field auto-fill | Entering a valid Income alone | Income = 3,000 | Loan Amount auto-fills to "45,000" (income × 15); Tenure auto-selects "60 Months"; Next becomes enabled |
| TC007 | Calculator output | Interest Rate is static | Page load, then with valid inputs | Always shows "7.88% p.a.", regardless of Income/Loan Amount entered |
| TC008 | Gross Monthly Income | Non-numeric input | Type "abcdef" | Input mask strips non-numeric characters, same as Loan Amount |
| TC009 | Calculator output | Monthly Repayment Amount updates | Income=5,000, Loan Amount=10,000, Tenure=24 Months | Value moves from "MYR 0.00" to a non-zero calculated amount |
| TC010 | Loan Amount | Required field, filled alone | Focus then blur Loan Amount, leave Income untouched | Error: "Minimum loan amount is MYR 2,000."; Next stays disabled (Income is not auto-filled by Loan Amount) |
| TC011 | Loan Amount | Below minimum | 1,999 (income=10,000) | Error: "Minimum loan amount is MYR 2,000." |
| TC012 | Loan Amount | At minimum boundary | 2,000 (income=10,000) | No error (accepted) |
| TC013 | Loan Amount | Above minimum | 2,001 (income=10,000) | No error (accepted) |
| TC014–TC017 | Loan Amount | Dynamic maximum = Income × 15 | income=2,000→max 30,000; 3,000→45,000; 5,000→75,000; 10,000→150,000 | Amount = max is accepted, Next enabled; max + 1,000 shows "Maximum loan amount is MYR {max}." and disables Next |
| TC018 | Loan Amount | Max-boundary auto-clamp quirk | max + 1 (e.g. 45,001 with income=3,000) | Silently corrected back down to the max ("45,000"); no error shown; Next stays enabled |
| TC019 | Loan Amount | Non-numeric input | Type "abc" | Input mask strips non-numeric characters; field only ever contains digits/commas |
| TC020 | Loan Tenure | Options | Open dropdown | Exactly 6 options: 24, 36, 48, 60, 72, 84 Months |
| TC021–TC026 | Loan Tenure | Selection | Select each of the 6 options (after Income is set) | Selected value updates to match the chosen option |
| TC027 | Next button | Enable/disable logic | Toggle Income/Loan Amount between valid, invalid, empty | Disabled on load; disabled if only Loan Amount is filled; enabled once Income is valid; disabled again if Loan Amount is pushed clearly over the max |
| TC028 | Loan Amount / Next button | Below minimum after auto-fill | Income=5,000 (auto-fills loan to 75,000), then set Loan Amount=500 | Min error re-appears, Next disables again |
| TC029 | End-to-end | Happy path submission | Income=5,000, Loan Amount=20,000 (override), Tenure=36 Months, click Next | Navigates to `/eform-app/loans/lucy` and the "quick verification" step (Full Name, NRIC, Mobile, Email) is displayed |
| TC030 | Language | English is the default | Page load | Toggle shows "EN"; page content is in English |
| TC031 | Language | Toggle to Bahasa Malaysia and back | Click the EN/BM toggle twice | Field labels and Next button text switch to BM, then switch back to English on the second click - no separate language menu, it's a straight toggle |
| TC032 | Language | Validation messages in BM | Toggle to BM, then leave Income/Loan Amount empty | Errors appear in Bahasa Malaysia ("Pendapatan kasar bulanan minimum adalah MYR 2,000." / "Jumlah pinjaman minimum adalah MYR 2,000.") |

## Cross-check against the sample test case sheet

TC007, TC008, TC009, and TC030–TC032 above were added after comparing this suite against a
separately-provided sample test case sheet for the same page, which covered a few areas this
suite didn't yet have (interest rate/repayment display, income masking, and the language
toggle). Everything else in that sheet was already covered here under different IDs.

A few things in that sheet didn't match what the live page actually does, confirmed by
re-checking directly rather than taking either source on faith:

- It expects the page title to read "Personal Loan Calculator." The actual `document.title` is
  **"Cash Plus Personal Loan"** - "Personal Loan Calculator" is the on-page heading text, not
  the title. TC001 asserts the real title.
- It expects the Tenure dropdown to have 4 options (24/36/48/60 Months). The live dropdown has
  **6** (24/36/48/60/72/84 Months), confirmed twice on separate runs. TC020 asserts the verified 6.
- It has a case for "Income and Loan Amount valid, Tenure left unselected, Next stays disabled."
  That state isn't reachable on the live form - entering a valid Income auto-selects Tenure to
  60 Months as a side effect (TC006), so you can never get a valid Income *and* Loan Amount with
  Tenure still empty. Not implemented as its own case for that reason.

## Notes / out of scope

- Gross Monthly Income and Loan Amount use different input masks under the hood (income
  shifts digits in as cents, loan amount is a plain integer). Handled in `LoanCalculatorPage`,
  not a business rule worth its own test case.
- Biggest thing to know: Income drives Loan Amount and Tenure via auto-fill, the three fields
  aren't independent. Covered in TC006, more detail in the README.
- Stops at confirming the Lucy page loads (matches the given scenario). Not filling in or
  submitting NRIC/personal details there - that's real PII on a production banking site and
  wasn't part of what was asked.
