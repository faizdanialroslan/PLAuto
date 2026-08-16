const { test, expect } = require('@playwright/test');
const { LoanCalculatorPage } = require('../pages/LoanCalculatorPage');
const { BM_TEXT } = require('../fixtures/testData');

// separate file since this is really its own feature area, not a form validation concern
test.describe('Personal Loan Calculator - language toggle', () => {
  let calc;

  test.beforeEach(async ({ page }) => {
    calc = new LoanCalculatorPage(page);
    await calc.goto();
  });

  test('TC030: Verify English (EN) is the default language on page load', async () => {
    expect(await calc.getCurrentLanguage()).toBe('EN');
    await expect(calc.page.getByText('Personal Loan Calculator')).toBeVisible();
  });

  test('TC031: Verify toggling the language switches labels and Next button text to Bahasa Malaysia, and back', async () => {
    // labels lag the toggle button's own text by a beat, so use an auto-retrying matcher
    await calc.toggleLanguage();
    await expect(calc.page.locator('mat-label')).toHaveText(BM_TEXT.fieldLabels);
    await expect(calc.nextButton).toHaveText(BM_TEXT.nextButton);

    // and back to English again - it's a straight toggle, no separate language menu
    await calc.toggleLanguage();
    await expect(calc.page.getByText('Personal Loan Calculator')).toBeVisible();
    expect(await calc.getCurrentLanguage()).toBe('EN');
  });

  test('TC032: Verify validation messages display in Bahasa Malaysia after toggling', async () => {
    await calc.toggleLanguage();

    await calc.touchAndBlur(calc.monthlyIncomeInput);
    await calc.touchAndBlur(calc.loanAmountInput);

    await expect(calc.errorMessages).toHaveText([BM_TEXT.minIncomeError, BM_TEXT.minLoanAmountError]);
  });
});
