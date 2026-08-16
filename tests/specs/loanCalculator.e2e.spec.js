const { test, expect } = require('@playwright/test');
const { LoanCalculatorPage } = require('../pages/LoanCalculatorPage');
const { LucyPage } = require('../pages/LucyPage');
const { validApplicant, ERROR_MESSAGES } = require('../fixtures/testData');

// covers the Gherkin scenario end to end:
//   Given I am on the CIMB Group website
//   And I navigate to the Personal Loan Calculator page
//   When I perform validation testing on all fields in the Loan Calculator page
//   Then I verify that all fields in the Loan Calculator page and their respective validations are correct
//   When I select all the necessary fields and click Next
//   Then I verify it navigates to the Lucy page successfully
//
// full validation matrix lives in loanCalculator.validation.spec.js - this one just does
// a quick spot-check before running the happy path.
test.describe('Personal Loan Calculator - E2E happy path', () => {
  test('TC029: Verify clicking Next with all valid inputs navigates to the Lucy page', async ({ page }) => {
    await test.step('Given I am on the CIMB Group website', async () => {
      await page.goto('https://www.cimb.com.my', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/cimb\.com\.my/);
    });

    const calc = new LoanCalculatorPage(page);
    await test.step('And I navigate to the Personal Loan Calculator page', async () => {
      await calc.goto();
    });

    await test.step('When I perform validation testing on the Loan Calculator fields', async () => {
      await calc.touchAndBlur(calc.monthlyIncomeInput);
      expect(await calc.getVisibleErrors()).toContain(ERROR_MESSAGES.minIncome);
      expect(await calc.isNextEnabled()).toBe(false);
    });

    await test.step('Then all fields and their validations behave correctly', async () => {
      await calc.fillMonthlyIncome(validApplicant.monthlyIncome);
      await calc.fillLoanAmount(validApplicant.loanAmount);
      await calc.selectTenure(validApplicant.tenure);
      expect(await calc.getVisibleErrors()).toEqual([]);
    });

    await test.step('When I select all necessary fields and click Next', async () => {
      expect(await calc.isNextEnabled()).toBe(true);
      await calc.clickNext();
    });

    await test.step('Then it navigates to the Lucy page successfully', async () => {
      const lucy = new LucyPage(page);
      await lucy.expectLoaded();
    });
  });
});
