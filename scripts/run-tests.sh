#!/bin/bash
# Runs the suite then the full reporting pipeline (Allure, Excel, both auto-opened).
#
# Needs to be a real script rather than a one-line npm chain so `npm test -- --project=chromium`
# actually forwards to playwright test - npm just appends extra args to the end of a script
# string, so a multi-command chain would've tacked the flag onto the last command instead.
#
# Keeps going even if tests fail, so the reports still reflect what happened.
set +e

npx playwright test "$@"
npm run allure:generate
node scripts/generate-xlsx-report.js
npm run report
npm run allure:open
