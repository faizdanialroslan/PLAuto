#!/bin/bash
# Same argument-forwarding reasoning as run-tests.sh, just for the lighter
# "tests + rebuild the Excel sheet only" path (no Allure/report opening).
set +e

npx playwright test "$@"
node scripts/generate-xlsx-report.js
