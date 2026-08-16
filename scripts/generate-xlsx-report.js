// Rebuilds test-cases/CIMB_Loan_Calculator_Test_Cases.xlsx from the last test run - one tab
// per browser, Status pulled from the actual result, not hand-typed. Needs reports/results.json
// to already exist, so run it via npm run test:xlsx (or after any full test run).

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const rows = require('./testCaseData');

const RESULTS_JSON = path.join(__dirname, '..', 'reports', 'results.json');
const OUTPUT_XLSX = path.join(__dirname, '..', 'test-cases', 'CIMB_Loan_Calculator_Test_Cases.xlsx');

const PROJECT_LABELS = {
  chromium: 'Chromium',
  firefox: 'Firefox',
  webkit: 'Safari', // webkit is the engine, Safari is what it's shipped as - matches how the user thinks of it
};

const STATUS_LABELS = {
  passed: 'Pass',
  failed: 'Fail',
  timedOut: 'Fail (timeout)',
  interrupted: 'Interrupted',
  skipped: 'Skipped',
};

if (!fs.existsSync(RESULTS_JSON)) {
  console.error(`No test run found at ${RESULTS_JSON}.\nRun "npm test" (or "npm run test:xlsx") first.`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf8'));

// spec titles look like "TC014: Verify Loan Amount maximum is..." - pull the ID off the front
const TC_ID = /^(TC\d+)/;

// { [projectName]: { [tcId]: status } }
const statusByProject = {};

function recordSpec(spec) {
  const match = spec.title.match(TC_ID);
  if (!match) return; // not one of our numbered cases (shouldn't happen, but don't crash on it)
  const id = match[1];

  for (const test of spec.tests) {
    const project = test.projectName;
    const last = test.results[test.results.length - 1];
    if (!last) continue;
    statusByProject[project] ??= {};
    statusByProject[project][id] = STATUS_LABELS[last.status] || last.status;
  }
}

function walk(suite) {
  (suite.specs || []).forEach(recordSpec);
  (suite.suites || []).forEach(walk);
}
report.suites.forEach(walk);

// report.config.projects lists every project in the config, even ones a --project filter
// excluded from this run - so filter down to projects that actually have results, otherwise
// a chromium-only run still gets 3 tabs with 2 empty "Not Run" ones.
const projectOrder = report.config.projects
  .map((p) => p.name)
  .filter((name) => statusByProject[name]);

const HEADER = [
  'TC ID', 'Category', 'Test Case Description', 'Pre-condition',
  'Test Steps', 'Test Data', 'Expected Result', 'Priority', 'Status',
];

const COLUMN_WIDTHS = [
  { wch: 8 }, { wch: 20 }, { wch: 42 }, { wch: 28 },
  { wch: 40 }, { wch: 28 }, { wch: 55 }, { wch: 9 }, { wch: 14 },
];

const wb = XLSX.utils.book_new();

for (const project of projectOrder) {
  const statuses = statusByProject[project] || {};
  const sheetRows = rows.map((row) => {
    const [id] = row;
    return [...row, statuses[id] || 'Not Run'];
  });

  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...sheetRows]);
  ws['!cols'] = COLUMN_WIDTHS;

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 0; R <= range.e.r; R++) {
    for (let C = 0; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        alignment: { vertical: 'top', wrapText: true },
        font: R === 0 ? { bold: true } : undefined,
      };
    }
  }

  const sheetName = PROJECT_LABELS[project] || project;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

XLSX.writeFile(wb, OUTPUT_XLSX);

const total = rows.length;
console.log(`Wrote ${projectOrder.length} tab(s) x ${total} rows to ${path.relative(process.cwd(), OUTPUT_XLSX)}`);
for (const project of projectOrder) {
  const statuses = statusByProject[project] || {};
  const passed = Object.values(statuses).filter((s) => s === 'Pass').length;
  console.log(`  ${PROJECT_LABELS[project] || project}: ${passed}/${total} passed`);
}
