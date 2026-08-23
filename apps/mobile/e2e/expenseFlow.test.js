import testHelpers from './helpers/testHelpers.js';

describe('Expense management flow', () => {
  beforeEach(async () => {
    await testHelpers.launchFreshApp();
  });

  it('creates, edits, and explicitly deletes a personal expense', async () => {
    await testHelpers.createExpense('Lunch', '12.75');
    await testHelpers.verifyExpense('Lunch', '12.75');

    await testHelpers.waitAndTap(by.label('Edit Lunch'));
    await testHelpers.waitAndReplace(by.id('expense-title-input'), 'Dinner');
    await testHelpers.waitAndReplace(by.id('expense-amount-input'), '25.00');
    await testHelpers.submitExpenseForm();

    await testHelpers.verifyExpense('Dinner', '25.00');
    await testHelpers.expectGone(by.text('Lunch'));

    await testHelpers.waitAndTap(by.label('Delete Dinner'));
    await testHelpers.expectVisible(
      by.text('Are you sure you want to delete this expense?'),
    );
    await testHelpers.dismissAlert('Delete');

    await testHelpers.expectGone(by.text('Dinner'));
    await testHelpers.expectVisible(
      by.text(
        'No expenses to display. Add a personal expense or get involved in a group expense.',
      ),
    );
  });

  it('shows the implemented validation alerts', async () => {
    await testHelpers.waitAndTap(by.id('add-expense-fab'));
    await testHelpers.submitExpenseForm();

    await testHelpers.expectVisible(
      by.text('Please fill all required fields.'),
    );
    await testHelpers.dismissAlert();

    await testHelpers.waitAndType(by.id('expense-title-input'), 'Invalid');
    await testHelpers.waitAndType(by.id('expense-amount-input'), '0');
    await testHelpers.submitExpenseForm();

    await testHelpers.expectVisible(
      by.text('Amount must be a positive value with valid currency precision.'),
    );
  });

  it('keeps a selected category and optional caption', async () => {
    await testHelpers.createExpense('Movie night', '20.00', {
      category: 'Entertainment',
      caption: 'Tickets and snacks',
    });

    await testHelpers.verifyExpense('Movie night', '20.00');
    await testHelpers.expectVisible(by.text('Entertainment'));
    await testHelpers.expectVisible(by.text('Tickets and snacks'));
  });
});
