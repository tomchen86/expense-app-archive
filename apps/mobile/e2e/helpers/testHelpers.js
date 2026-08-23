const testHelpers = {
  async waitAndTap(matcher, timeout = 10000) {
    await waitFor(element(matcher)).toBeVisible().withTimeout(timeout);
    await element(matcher).tap();
  },

  async waitAndType(matcher, text, timeout = 10000) {
    await waitFor(element(matcher)).toBeVisible().withTimeout(timeout);
    await element(matcher).typeText(text);
  },

  async waitAndReplace(matcher, text, timeout = 10000) {
    await waitFor(element(matcher)).toBeVisible().withTimeout(timeout);
    await element(matcher).replaceText(text);
  },

  async expectVisible(matcher, timeout = 10000) {
    await waitFor(element(matcher)).toBeVisible().withTimeout(timeout);
  },

  async expectGone(matcher, timeout = 10000) {
    await waitFor(element(matcher)).not.toExist().withTimeout(timeout);
  },

  async launchFreshApp() {
    await device.launchApp({ resetAppState: true, newInstance: true });
    await this.expectVisible(by.id('add-expense-fab'), 20000);
  },

  async relaunchPersistedApp() {
    await device.launchApp({ newInstance: true });
    await this.expectVisible(by.id('add-expense-fab'), 20000);
  },

  async tapTab(label) {
    const tabTestIDs = {
      Expenses: 'tab-expenses',
      Groups: 'tab-groups',
      Settings: 'tab-settings',
    };
    const testID = tabTestIDs[label];
    if (!testID) {
      throw new Error('Unknown mobile tab: ' + label);
    }
    await this.waitAndTap(by.id(testID));
  },

  async dismissAlert(buttonLabel = 'OK') {
    if (device.getPlatform() === 'ios') {
      const buttonIndex = buttonLabel === 'OK' ? 0 : 1;
      await element(by.type('_UIAlertControllerActionView'))
        .atIndex(buttonIndex)
        .tap();
      return;
    }

    await this.waitAndTap(by.text(buttonLabel));
  },

  async submitExpenseForm() {
    await element(by.id('expense-form-scroll-view')).scrollTo('bottom');
    await waitFor(element(by.id('save-expense-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('save-expense-button')).tap();
  },

  async setUsername(username) {
    await this.tapTab('Settings');
    await this.waitAndReplace(by.id('username-input'), username);
    await this.waitAndTap(by.id('save-settings-button'));
    await this.expectVisible(by.text('Settings saved successfully'));
    await this.dismissAlert();
    await this.tapTab('Expenses');
    await this.expectVisible(by.id('add-expense-fab'));
  },

  async createExpense(title, amount, { category = null, caption = null } = {}) {
    await this.tapTab('Expenses');
    await this.waitAndTap(by.id('add-expense-fab'));
    await this.waitAndType(by.id('expense-title-input'), title);
    await this.waitAndType(by.id('expense-amount-input'), amount);

    if (category) {
      await this.waitAndTap(by.id('category-picker'));
      await this.waitAndTap(by.text(category));
    }

    if (caption) {
      await this.waitAndType(by.id('expense-caption-input'), caption);
    }

    await this.submitExpenseForm();
    await this.expectVisible(by.id('expense-list'));
    await this.expectVisible(by.text(title));
  },

  async createGroup(groupName) {
    await this.tapTab('Groups');
    await this.waitAndTap(by.id('add-group-button'));
    await this.waitAndType(by.id('group-name-input'), groupName);
    await this.waitAndTap(by.id('create-group-submit'));
    await this.expectVisible(by.text(groupName));
  },

  async verifyExpense(title, decimalAmount, currency = 'USD') {
    await this.expectVisible(by.text(title));
    await this.expectVisible(
      by.label(`Expense amount ${currency} ${decimalAmount}`),
    );
  },
};

module.exports = testHelpers;
