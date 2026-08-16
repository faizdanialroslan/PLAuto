const { test, expect } = require('@playwright/test');
const {
  LoanCalculatorPage,
  TENURE_OPTIONS,
  AUTO_SUGGESTED_TENURE,
  PAGE_TITLE,
} = require('../pages/LoanCalculatorPage');
const {
  incomeBoundaries,
  loanAmountBoundaries,
  incomeToMaxLoan,
  ERROR_MESSAGES,
} = require('../fixtures/testData');

test.describe('Personal Loan Calculator - field validation', () => {
  let calc;

  test.beforeEach(async ({ page }) => {
    calc = new LoanCalculatorPage(page);
    await calc.goto();
  });

  test('TC001: Verify calculator page loads with correct title and default field states', async () => {
    await expect(calc.page).toHaveTitle(PAGE_TITLE);
    await expect(calc.monthlyIncomeInput).toBeVisible();
    await expect(calc.loanAmountInput).toBeVisible();
    await expect(calc.tenureSelect).toBeVisible();
    expect(await calc.getSelectedTenure()).toBe('');
    expect(await calc.isNextEnabled()).toBe(false);
  });

  test('TC002: Verify validation error when Income field is touched and left empty', async () => {
    await calc.touchAndBlur(calc.monthlyIncomeInput);
    const errors = await calc.getVisibleErrors();
    expect(errors).toContain(ERROR_MESSAGES.minIncome);
    expect(await calc.isNextEnabled()).toBe(false);
  });

  // TC003/004/005 - income boundaries around the MYR 2,000 minimum
  const incomeBoundaryIds = ['TC003', 'TC004', 'TC005'];
  incomeBoundaries.forEach(({ label, value, expectValid }, i) => {
    test(`${incomeBoundaryIds[i]}: Verify Income ${label} is ${expectValid ? 'accepted' : 'rejected'}`, async () => {
      await calc.fillMonthlyIncome(value);
      const errors = await calc.getVisibleErrors();
      if (expectValid) {
        expect(errors).not.toContain(ERROR_MESSAGES.minIncome);
      } else {
        expect(errors).toContain(ERROR_MESSAGES.minIncome);
        expect(await calc.isNextEnabled()).toBe(false);
      }
    });
  });

  // income drives loan amount + tenure too - that's why Next can go live off income alone
  test('TC006: Verify a valid Income auto-populates Loan Amount and Loan Tenure', async () => {
    await calc.fillMonthlyIncome(3_000);
    await expect(calc.loanAmountInput).toHaveValue('45,000');
    expect(await calc.getSelectedTenure()).toBe(AUTO_SUGGESTED_TENURE);
    expect(await calc.isNextEnabled()).toBe(true);
  });

  test('TC007: Verify Interest Rate is a static 7.88% p.a. regardless of inputs', async () => {
    await expect(calc.page.getByText('7.88% p.a.')).toBeVisible();
    await calc.fillMonthlyIncome(8_000);
    await calc.fillLoanAmount(50_000);
    await expect(calc.page.getByText('7.88% p.a.')).toBeVisible();
  });

  // same masking/rejection behaviour as loan amount (TC019), just checking income isn't
  // wired up differently
  test('TC008: Verify Income field rejects alphabetical characters', async () => {
    await calc.monthlyIncomeInput.click();
    await calc.page.keyboard.type('abcdef', { delay: 30 });
    const value = await calc.monthlyIncomeInput.inputValue();
    expect(/^[0-9,.]*$/.test(value)).toBe(true);
  });

  test('TC009: Verify Monthly Repayment Amount updates once all inputs are valid', async () => {
    await expect(calc.monthlyRepaymentText).toContainText('MYR 0.00');
    await calc.fillMonthlyIncome(5_000);
    await calc.fillLoanAmount(10_000);
    await calc.selectTenure('24 Months');
    await expect(calc.monthlyRepaymentText).not.toContainText('MYR 0.00');
  });

  test('TC010: Verify validation error when Loan Amount is filled alone with Income untouched', async () => {
    await calc.touchAndBlur(calc.loanAmountInput);
    const errors = await calc.getVisibleErrors();
    expect(errors).toContain(ERROR_MESSAGES.minLoanAmount);
    // no reverse auto-fill - income is still untouched, so Next can't go live
    expect(await calc.isNextEnabled()).toBe(false);
  });

  // TC011/012/013 - loan amount boundaries around MYR 2,000 (income kept high to isolate this)
  const loanBoundaryIds = ['TC011', 'TC012', 'TC013'];
  loanAmountBoundaries.forEach(({ label, value, expectValid }, i) => {
    test(`${loanBoundaryIds[i]}: Verify Loan Amount ${label} is ${expectValid ? 'accepted' : 'rejected'}`, async () => {
      await calc.fillMonthlyIncome(10_000);
      await calc.fillLoanAmount(value);
      const errors = await calc.getVisibleErrors();
      if (expectValid) {
        expect(errors).not.toContain(ERROR_MESSAGES.minLoanAmount);
      } else {
        expect(errors).toContain(ERROR_MESSAGES.minLoanAmount);
        expect(await calc.isNextEnabled()).toBe(false);
      }
    });
  });

  // max loan = income x 15 across a few income tiers. Only a clear overage (max + 1,000)
  // actually throws the error - see TC018 for why.
  const maxLoanIds = ['TC014', 'TC015', 'TC016', 'TC017'];
  incomeToMaxLoan.forEach(({ income, maxLoan }, i) => {
    test(`${maxLoanIds[i]}: Verify Loan Amount maximum is enforced as Income x 15 (income = ${income.toLocaleString()})`, async () => {
      await calc.fillMonthlyIncome(income);

      // exactly at the computed max must be accepted
      await calc.fillLoanAmount(maxLoan);
      let errors = await calc.getVisibleErrors();
      expect(errors).not.toContain(ERROR_MESSAGES.maxLoanAmount(maxLoan));
      expect(await calc.isNextEnabled()).toBe(true);

      // a clear overage must be rejected
      await calc.fillLoanAmount(maxLoan + 1_000);
      errors = await calc.getVisibleErrors();
      expect(errors).toContain(ERROR_MESSAGES.maxLoanAmount(maxLoan));
      expect(await calc.isNextEnabled()).toBe(false);
    });
  });

  // found this by accident poking at the boundary - go 1 over the max and it just snaps
  // back instead of erroring. worth its own case so it doesn't look like a regression later.
  test('TC018: Verify Loan Amount entered 1 above the maximum is silently clamped back to the maximum', async () => {
    await calc.fillMonthlyIncome(3_000); // max = 45,000
    await calc.fillLoanAmount(45_001);
    await expect(calc.loanAmountInput).toHaveValue('45,000');
    expect(await calc.getVisibleErrors()).toEqual([]);
    expect(await calc.isNextEnabled()).toBe(true);
  });

  test('TC019: Verify Loan Amount field rejects non-numeric characters', async () => {
    await calc.typeIntoLoanAmount('abc');
    const value = await calc.loanAmountInput.inputValue();
    expect(/^[0-9,]*$/.test(value)).toBe(true);
  });

  test('TC020: Verify Loan Tenure dropdown displays the correct options', async () => {
    await calc.tenureSelect.click();
    const options = await calc.page.locator('mat-option').allInnerTexts();
    expect(options.map((o) => o.trim())).toEqual(TENURE_OPTIONS);
  });

  // TC021-026 - one per tenure option
  TENURE_OPTIONS.forEach((option, i) => {
    const id = `TC0${21 + i}`;
    test(`${id}: Verify user can select "${option}" as the Loan Tenure`, async () => {
      await calc.fillMonthlyIncome(5_000); // establish a valid form state first
      await calc.selectTenure(option);
      expect(await calc.getSelectedTenure()).toBe(option);
    });
  });

  test('TC027: Verify Next button enable/disable logic across Income and Loan Amount states', async () => {
    expect(await calc.isNextEnabled()).toBe(false);

    // filling only Loan Amount does not unlock the form (Income still invalid)
    await calc.fillLoanAmount(20_000);
    expect(await calc.isNextEnabled()).toBe(false);

    // a valid Income auto-fills Loan Amount/Tenure and unlocks Next
    await calc.fillMonthlyIncome(5_000);
    expect(await calc.isNextEnabled()).toBe(true);

    // pushing loan amount clearly over the dynamic max disables Next again
    await calc.fillLoanAmount(calc.maxLoanFor(5_000) + 1_000);
    expect(await calc.isNextEnabled()).toBe(false);
  });

  // TC027 covers going over the max after auto-fill - this is the other side, going under the min
  test('TC028: Verify Next button disables again if Loan Amount is dropped below the minimum after auto-fill', async () => {
    await calc.fillMonthlyIncome(5_000);
    expect(await calc.isNextEnabled()).toBe(true);

    await calc.fillLoanAmount(500);
    expect(await calc.getVisibleErrors()).toContain(ERROR_MESSAGES.minLoanAmount);
    expect(await calc.isNextEnabled()).toBe(false);
  });
});
