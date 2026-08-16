const { expect } = require('@playwright/test');

const TENURE_OPTIONS = ['24 Months', '36 Months', '48 Months', '60 Months', '72 Months', '84 Months'];

// Tenure is empty on page load - it only gets set once a valid income is entered.
const AUTO_SUGGESTED_TENURE = '60 Months';

const MIN_MONTHLY_INCOME = 2_000;
const MIN_LOAN_AMOUNT = 2_000;
const MAX_LOAN_MULTIPLIER = 15; // max loan = income x 15
const PAGE_TITLE = 'Cash Plus Personal Loan'; // document title, not the on-page H3

// mat-error doesn't render immediately on blur - the currency mask + Angular's change
// detection need a beat to catch up. Confirmed via a failure snapshot showing the error
// already in the DOM while our read still came back empty. Not a live-site flake.
const VALIDATION_SETTLE_MS = 300;

class LoanCalculatorPage {
  constructor(page) {
    this.page = page;
    this.path = '/eform-app/loans/calculator?action=calc&language=en';

    this.monthlyIncomeInput = page.locator('input[formcontrolname="monthlyIncome"]');
    this.loanAmountInput = page.locator('input[formcontrolname="loanAmount"]');
    this.tenureSelect = page.locator('mat-select#mat-select-0');
    this.nextButton = page.getByRole('button', { name: /Next|Seterusnya/ });
    this.monthlyRepaymentText = page.getByText('Monthly Repayment Amount').locator('..');
    this.errorMessages = page.locator('mat-error');
    // the only button before Next - swaps between "EN" and "BM" and doubles as a status indicator
    this.languageToggle = page.locator('button').first();
  }

  async goto() {
    await this.page.goto(this.path, { waitUntil: 'networkidle' });
    await expect(this.monthlyIncomeInput).toBeVisible();
  }

  async getCurrentLanguage() {
    return (await this.languageToggle.innerText()).trim();
  }

  // client-side only, doesn't touch the URL. translated text lags the button's own
  // label a beat, so wait for that to flip before returning.
  async toggleLanguage() {
    const before = await this.getCurrentLanguage();
    await this.languageToggle.click();
    await expect(this.languageToggle).not.toHaveText(before);
  }

  // income field is a currency mask that shifts in from the right (last 2 digits = cents),
  // so fill('5000') alone gives you MYR 50.00, not MYR 5,000. pad with '00' to land on whole ringgit.
  async fillMonthlyIncome(ringgit) {
    const raw = `${ringgit}00`;
    await this.monthlyIncomeInput.fill(raw);
    await this.monthlyIncomeInput.blur();
    await this.page.waitForTimeout(VALIDATION_SETTLE_MS);
  }

  async typeMonthlyIncome(ringgit) {
    const raw = `${ringgit}00`;
    await this.monthlyIncomeInput.click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.type(raw, { delay: 50 });
    await this.monthlyIncomeInput.blur();
    await this.page.waitForTimeout(VALIDATION_SETTLE_MS);
  }

  // loan amount is just a thousand-separated integer, no decimal shifting like income has
  async fillLoanAmount(ringgit) {
    await this.loanAmountInput.fill(String(ringgit));
    await this.loanAmountInput.blur();
    await this.page.waitForTimeout(VALIDATION_SETTLE_MS);
  }

  async typeIntoLoanAmount(raw) {
    await this.loanAmountInput.click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.type(raw, { delay: 50 });
    await this.loanAmountInput.blur();
    await this.page.waitForTimeout(VALIDATION_SETTLE_MS);
  }

  // for the "leave it empty" required-field tests
  async touchAndBlur(input) {
    await input.click();
    await input.blur();
    await this.page.waitForTimeout(VALIDATION_SETTLE_MS);
  }

  async selectTenure(label) {
    await this.tenureSelect.click();
    const option = this.page.getByRole('option', { name: label, exact: true });
    await option.waitFor({ state: 'visible' });
    await option.click();
    await expect(this.tenureSelect).not.toHaveAttribute('aria-expanded', 'true');
  }

  async getSelectedTenure() {
    return (await this.tenureSelect.innerText()).trim();
  }

  async getVisibleErrors() {
    return this.errorMessages.allInnerTexts();
  }

  async isNextEnabled() {
    return !(await this.nextButton.isDisabled());
  }

  async clickNext() {
    await this.nextButton.click();
  }

  maxLoanFor(monthlyIncome) {
    return monthlyIncome * MAX_LOAN_MULTIPLIER;
  }
}

module.exports = {
  LoanCalculatorPage,
  TENURE_OPTIONS,
  AUTO_SUGGESTED_TENURE,
  MIN_MONTHLY_INCOME,
  MIN_LOAN_AMOUNT,
  MAX_LOAN_MULTIPLIER,
  PAGE_TITLE,
};
