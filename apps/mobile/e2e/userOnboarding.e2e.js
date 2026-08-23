import testHelpers from './helpers/testHelpers.js';

describe('First-use group journey', () => {
  beforeEach(async () => {
    await testHelpers.launchFreshApp();
  });

  it('allows personal expenses before a name is configured', async () => {
    await testHelpers.createExpense('First coffee', '4.50');

    await testHelpers.verifyExpense('First coffee', '4.50');
  });

  it('routes an unnamed user to Settings before creating a group', async () => {
    await testHelpers.tapTab('Groups');
    await testHelpers.waitAndTap(by.id('add-group-fab'));

    await testHelpers.expectVisible(by.text('Username Required'));
    await testHelpers.expectVisible(
      by.text('Please set your username in Settings before creating a group.'),
    );
    await testHelpers.dismissAlert('Go to Settings');

    await testHelpers.waitAndReplace(by.id('username-input'), 'First User');
    await testHelpers.waitAndTap(by.id('save-settings-button'));
    await testHelpers.expectVisible(by.text('Settings saved successfully'));
    await testHelpers.dismissAlert();

    await testHelpers.createGroup('My First Group');
    await testHelpers.expectVisible(by.label('Open My First Group'));
  });

  it('opens an empty group and exposes its real empty state', async () => {
    await testHelpers.setUsername('Group Owner');
    await testHelpers.createGroup('Weekend Trip');
    await testHelpers.waitAndTap(by.label('Open Weekend Trip'));

    await testHelpers.expectVisible(by.text('No expenses in this group yet.'));
    await testHelpers.expectVisible(by.id('add-expense-fab'));
  });

  it('archives and restores a group without deleting it', async () => {
    await testHelpers.setUsername('Archive Owner');
    await testHelpers.createGroup('Past Trip');

    await element(by.label('Open Past Trip')).swipe('left', 'fast', 0.75);
    await testHelpers.waitAndTap(by.label('Archive Past Trip'));

    await testHelpers.expectGone(by.text('Past Trip'));
    await testHelpers.expectVisible(
      by.text('Group archived · Find it in Settings'),
    );
    await testHelpers.tapTab('Settings');
    await testHelpers.waitAndTap(by.label('Archived groups, 1'));
    await testHelpers.expectVisible(by.text('Past Trip'));

    await testHelpers.waitAndTap(by.label('Restore Past Trip'));
    await testHelpers.expectGone(by.text('Past Trip'));
    await testHelpers.tapTab('Groups');
    await testHelpers.expectVisible(by.text('Past Trip'));
  });
});
