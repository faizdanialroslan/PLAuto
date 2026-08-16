# CIMB Personal Loan Calculator - Playwright Suite

Automated coverage for the CIMB Cash Plus Personal Loan calculator: field validation plus the
happy path through to the Lucy (eKYC) step.

Target: `https://applynow.cimb.com.my/eform-app/loans/calculator?action=calc&language=en`

## Structure

```
.
├── playwright.config.js
├── package.json
├── .github/workflows/playwright.yml # CI - see "CI" section below, deliberately not a
│                                     # copy of the local npm scripts
├── scripts/
│   ├── global-setup.js             # wipes reports/allure-results before every run
│   ├── testCaseData.js             # category/precondition/steps/priority for each TC ID
│   ├── generate-xlsx-report.js     # builds the xlsx from the last run's real results
│   ├── reopen-chrome-tab.sh        # closes an existing tab at a URL before opening it fresh
│   ├── run-tests.sh                # what `npm test` actually calls - forwards extra args
│   └── run-tests-xlsx.sh           # what `npm run test:xlsx` actually calls, same reason
├── tests/
│   ├── pages/
│   │   ├── LoanCalculatorPage.js   # calculator form page object
│   │   └── LucyPage.js             # post-Next eKYC step page object
│   ├── fixtures/
│   │   └── testData.js             # boundary values, income->max table, error strings
│   └── specs/
│       ├── loanCalculator.validation.spec.js
│       ├── loanCalculator.e2e.spec.js
│       └── loanCalculator.language.spec.js  # EN/BM toggle
├── test-cases/
│   ├── TestCases.md                 # simplified test case list
│   └── CIMB_Loan_Calculator_Test_Cases.xlsx  # same list, one tab per browser, live Pass/Fail
└── reports/                        # generated on test run, gitignored
```

## Setup

```bash
npm install
npx playwright install --with-deps
```

Allure's CLI needs a Java runtime to generate its report. There's no system JDK on this
machine and no Homebrew either, so rather than doing a system-wide install, a standalone
Temurin 21 JRE was downloaded straight from Eclipse Adoptium (checksum-verified) and unpacked
to `~/.local/share/temurin-jre-21` - outside the project, nothing on the system PATH, nothing
needing `sudo`. The `allure:generate`/`allure:open` scripts point `JAVA_HOME` at it directly.
To remove it: `rm -rf ~/.local/share/temurin-jre-21` and drop the `JAVA_HOME=...` prefix from
those two scripts.

## Running it

```bash
npm test                                 # everything, all three browsers - see "Reports" below
npm test -- --project=chromium           # same, but only chromium - reports follow suit too
npm test -- -g "TC001|TC014"             # same, but only tests matching this pattern
npm run test:validation     # just the validation spec (no reports rebuilt)
npm run test:e2e            # just the happy-path spec (no reports rebuilt)
npm run test:language       # just the EN/BM toggle spec (no reports rebuilt)
npm run test:headed         # watch it run in an actual browser
npm run test:ui             # Playwright's UI mode
npm run test:watch          # chromium only, headed, slowed down so you can watch each step
npx playwright test --project=chromium   # one browser only, no reports rebuilt
```

`npm test` is the "give me everything" command - the narrower scripts above are for quick
iteration while writing/debugging a specific test and intentionally skip the reporting step so
they stay fast.

Anything after `npm test --` gets forwarded straight to `playwright test` (`--project`, `-g`,
`--headed`, any Playwright CLI flag), and the whole reporting pipeline (Allure, Excel, both
report tabs) reflects only what actually ran. This has to go through a real shell script
(`scripts/run-tests.sh`) rather than a one-line `"test": "playwright test; npm run allure:..."`
in `package.json` - npm's `-- ` syntax only appends extra args to the very end of a script
string, so in a multi-command chain like that, `--project=chromium` would silently land after
the *last* command instead of reaching `playwright test` at all (found this the hard way: it ran
all three browsers regardless of the flag). `run-tests.sh` receives the args as `"$@"` and passes
them on to the right place.

## Reports

`npm test` produces all three report formats from the same run, in this order, and none of them
pile up between runs - each one gets replaced in place, not appended to or versioned:

1. **Playwright HTML** (`reports/playwright-html`) - built automatically as part of the test run
   itself, then served at the fixed `http://localhost:9323` and opened in your browser
   automatically. It's a single self-contained `index.html` that Playwright overwrites wholesale
   each run, so there's nothing to clean on disk here.
2. **Allure HTML** (`reports/allure-report`) - built and served at the fixed
   `http://127.0.0.1:52222`, also opened automatically. Allure's raw result files
   (`reports/allure-results`) are what it's built from, and that folder is the one thing that
   *doesn't* clean itself up on its own - Allure just keeps appending new result files to it
   forever. A `globalSetup` hook in `playwright.config.js` (`scripts/global-setup.js`) wipes that
   folder at the start of every single test run, however it's invoked (`npm test`,
   `npx playwright test --project=chromium`, a filtered `-g` run, whatever), so it never grows
   past one run's worth of data.
   - The one thing carried forward on purpose is `history/` - five small JSON files (not the
     full per-test results) that feed the report's Trend graph. `global-setup.js` copies it out
     of the previous `allure-report` before wiping `allure-results`, so the Trend graph still
     accumulates one point per run instead of resetting to "nothing to show" every time.

Both report servers use a fixed port specifically so the same URL can be relied on run after
run. Before opening either, the `report`/`allure:open` scripts: kill any previous instance of
that server (`pkill`) so orphaned processes/ports don't pile up; poll the port with `curl` until
it actually responds (rather than guessing a fixed delay - a JVM can take a bit to boot up)
before calling `open`, since opening a URL before its server is ready just shows a dead page; and
run `scripts/reopen-chrome-tab.sh`, which closes any existing Chrome tab already pointing at that
exact URL before opening a fresh one (Chrome-specific, since that's this machine's default
browser - a no-op if Chrome isn't running). Net effect: running `npm test` five times in a row
still leaves you with exactly one tab per report, not five.

3. **Excel** (`test-cases/CIMB_Loan_Calculator_Test_Cases.xlsx`) - rebuilt with one tab per
   browser that actually ran, Status column pulled from that run's actual result
   (Pass / Fail / Fail (timeout) / Not Run) - not hand-typed. Overwrites the same file every time
   rather than versioning copies. Still gets rebuilt even if some tests fail, so the sheet always
   reflects what actually happened. `scripts/generate-xlsx-report.js` reads
   `reports/results.json` (the JSON reporter output) and merges it with the static per-case
   metadata in `scripts/testCaseData.js`; run it on its own (`node
   scripts/generate-xlsx-report.js`) to rebuild the sheet from whatever the last run already
   produced, without re-running anything.
   - Run only a subset of browsers (e.g. `npx playwright test --project=chromium`) and the sheet
     follows suit - just a "Chromium" tab, not three tabs where two are empty "Not Run" filler.
     This needed an explicit fix: Playwright's JSON reporter always lists every project *defined*
     in `playwright.config.js` under `config.projects`, regardless of which ones a `--project`
     filter actually selected for that run - so naively using that list would still produce all
     three tabs. The generator instead only creates a tab for a project if it has real results.
     Allure and the Playwright HTML report never had this problem - they're built directly from
     what executed, not from the static project list.

`npm run test:report` runs the exact same `scripts/run-tests.sh` as `npm test` - it's kept as a
separate, more descriptive name for when you're specifically after the reporting step (and, like
`npm test`, correctly forwards `-- --project=chromium`-style args). `npm run test:xlsx` runs
`scripts/run-tests-xlsx.sh` instead, which skips Allure entirely for a faster "just give me the
sheet" loop.

Both the Playwright and Allure reports capture steps, and attach screenshots/trace/video
automatically on failure.

## CI

`.github/workflows/playwright.yml` runs on every push/PR to `main` (and manually via
`workflow_dispatch`). It deliberately does **not** just call `npm test` - that script
(`scripts/run-tests.sh`) auto-opens browser tabs via macOS's `open` command and Chrome-specific
AppleScript, and points Allure's `JAVA_HOME` at a JRE unpacked to a fixed path on this one Mac
(see "Setup" above) - none of which exists or makes sense on a headless `ubuntu-latest` runner.
Instead CI: runs `npx playwright test` directly, sets up its own Java via `actions/setup-java`
(Temurin 21, same as local), builds the Allure HTML report and the Excel sheet using the
underlying commands directly (`npx allure generate ...`, `node scripts/generate-xlsx-report.js`)
rather than the `npm run allure:generate`/`report`/`allure:open` scripts, and uploads the
Playwright HTML report, the built Allure report, and the Excel sheet as workflow artifacts
(14-day retention) - no auto-opening anything, since there's no browser to open it in.

## Things worth knowing about this form before you touch the suite

- **Income and Loan Amount aren't independent.** Type a valid Gross Monthly Income and the
  form auto-fills Loan Amount to the max you're eligible for (income x 15) and defaults
  Tenure to 60 Months. That's the whole reason Next can go enabled off one field. It doesn't
  work the other way - filling Loan Amount first does nothing until Income is set. See TC006.
- **The two money inputs use different masks.** Income shifts digits in from the right like a
  POS terminal (last 2 digits become cents), so typing "5000" gives you MYR 50.00, not
  MYR 5,000. `fillMonthlyIncome()` pads with `"00"` so you can just pass a plain ringgit
  number. Loan Amount is a normal thousand-separated integer, no shifting.
- **Both minimums are MYR 2,000, inclusive.** Below that: "Minimum gross monthly income is
  MYR 2,000." / "Minimum loan amount is MYR 2,000."
- **Max loan amount is dynamic** - income x 15 - and there's a rounding quirk right at that
  edge: 1 ringgit over and the field just snaps back down to the max, no error at all. Go
  further over (this suite uses +1,000) and you get the actual "Maximum loan amount is MYR
  {x}." error. Both behaviours are covered separately (TC014–TC017, TC018) so the clamp doesn't
  accidentally mask the real validation.
- A successful submit lands on `/eform-app/loans/lucy`, CIMB's eKYC intake (name, NRIC,
  mobile, email). The E2E test stops at confirming that page loaded - it doesn't fill or
  submit anything there, since that's real PII on a production banking site and it's outside
  what the scenario asks for anyway.
- **The language toggle is a plain flip, not a menu.** The first button on the page shows the
  currently active language ("EN" or "BM") and clicking it swaps the whole page's language and
  its own label in one go - no dropdown to pick from. It's client-side only; the URL's
  `language=en` param doesn't change either way. Translated content lags the button's own label
  by a render tick, so `toggleLanguage()` waits on the button text before returning, and the
  language spec asserts on the labels themselves with an auto-retrying matcher rather than a
  one-shot text read.
- **Reading errors right after `.blur()` is a real race, not live-site flakiness.** Caught this
  via a failure snapshot where the error text was already sitting in the DOM at the exact moment
  our one-shot `allInnerTexts()` read came back empty - the currency mask directive re-normalizes
  the value and Angular's change detection catches up a beat after the native blur event fires.
  Every method that triggers a blur (`fillMonthlyIncome`, `fillLoanAmount`,
  `typeMonthlyIncome`/`typeIntoLoanAmount`, and the `touchAndBlur()` helper used for the
  "required field" checks) now waits `VALIDATION_SETTLE_MS` (300ms) afterwards. `retries: 1` is
  also set permanently (not just in CI) since this suite hits a live production site - a
  reasonable safety net for genuine network blips, not a mask for bugs, since an actual bug fails
  on the retry too.

Full test list with expected results: `test-cases/TestCases.md`, including a short section on
where a separately-provided sample test case sheet didn't match what the live page actually does.
