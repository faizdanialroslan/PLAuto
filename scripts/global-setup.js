const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const RESULTS_DIR = path.join(REPORTS_DIR, 'allure-results');
const PRIOR_HISTORY_DIR = path.join(REPORTS_DIR, 'allure-report', 'history');

// Allure never cleans up its own result files, so this folder grows forever otherwise.
// globalSetup runs before any project starts no matter how the suite is invoked, so it's
// the one spot that reliably catches every entry point.
//
// history/ is worth keeping though - it's what feeds the Trend graph, so we carry it
// forward before wiping everything else.
module.exports = async function globalSetup() {
  const hasPriorHistory = fs.existsSync(PRIOR_HISTORY_DIR);
  const carriedHistory = hasPriorHistory
    ? fs.readdirSync(PRIOR_HISTORY_DIR).map((file) => [file, fs.readFileSync(path.join(PRIOR_HISTORY_DIR, file))])
    : [];

  fs.rmSync(RESULTS_DIR, { recursive: true, force: true });

  if (carriedHistory.length) {
    const newHistoryDir = path.join(RESULTS_DIR, 'history');
    fs.mkdirSync(newHistoryDir, { recursive: true });
    for (const [file, contents] of carriedHistory) {
      fs.writeFileSync(path.join(newHistoryDir, file), contents);
    }
  }
};
