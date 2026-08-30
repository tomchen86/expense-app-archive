import testHelpers from './helpers/testHelpers.js';

describe('Persisted data and calculations', () => {
  beforeEach(async () => {
    await testHelpers.launchFreshApp();
  });

  it('persists a personal expense across a process restart', async () => {
    await testHelpers.createExpense('Persistent expense', '50.00');
    await testHelpers.relaunchPersistedApp();

    await testHelpers.verifyExpense('Persistent expense', '50.00');
  });

  it('shows the stored category amount in personal insights', async () => {
    await testHelpers.createExpense('Groceries', '33.30');
    await testHelpers.waitAndTap(by.id('total-share-button'));

    await testHelpers.expectVisible(by.text('USD categories'));
    await testHelpers.expectVisible(by.id('insight-category-usd-food-dining'));
  });

  it('uses a fresh persisted store for an isolated test launch', async () => {
    await testHelpers.createExpense('Temporary fixture', '7.00');

    await testHelpers.launchFreshApp();

    await testHelpers.expectGone(by.text('Temporary fixture'));
    await testHelpers.expectVisible(
      by.text(
        'No expenses to display. Add a personal expense or get involved in a group expense.',
      ),
    );
  });
});
