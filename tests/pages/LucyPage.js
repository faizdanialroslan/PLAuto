const { expect } = require('@playwright/test');

class LucyPage {
  constructor(page) {
    this.page = page;
    this.urlPart = '/eform-app/loans/lucy';

    this.heading = page.getByText('To start, we need these details for a quick verification');
    this.fullNameInput = page.locator('input[formcontrolname="fullName"]');
    this.nricInput = page.locator('input[formcontrolname="nric"]');
    this.emailInput = page.locator('input[formcontrolname="email"]');
    this.nextButton = page.getByRole('button', { name: 'Next' });
  }

  // just confirms we landed here after clicking Next - we don't fill this step out
  async expectLoaded() {
    await expect(this.page).toHaveURL(new RegExp(this.urlPart.replace('/', '\\/')));
    await expect(this.heading).toBeVisible();
    await expect(this.fullNameInput).toBeVisible();
    await expect(this.nricInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
  }
}

module.exports = { LucyPage };
