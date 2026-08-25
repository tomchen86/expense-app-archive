import { useCategoryStore } from '../features/categoryStore';
import { useExpenseStore } from '../features/expenseStore';
import { DEFAULT_CATEGORIES } from '../../constants/expenses';

describe('CategoryStore', () => {
  beforeEach(() => {
    useCategoryStore.setState({
      categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    });
    useExpenseStore.setState({ expenses: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds a new category when the name is unique', () => {
    const { addCategory } = useCategoryStore.getState();

    const result = addCategory({ name: 'Fitness', color: '#111111' });
    const categories = useCategoryStore.getState().categories;

    expect(result).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      name: 'Fitness',
      color: '#111111',
    });
    expect(categories).toContainEqual(result);
  });

  it('rejects a color already assigned to another category', () => {
    const existing = useCategoryStore.getState().categories[0];

    expect(() =>
      useCategoryStore
        .getState()
        .addCategory({ name: 'Fitness', color: existing.color.toLowerCase() }),
    ).toThrow('already uses this color');
    expect(
      useCategoryStore
        .getState()
        .categories.some((category) => category.name === 'Fitness'),
    ).toBe(false);
  });

  it('warns and returns the existing category when adding a duplicate name', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const existing = useCategoryStore.getState().categories[0];

    const result = useCategoryStore
      .getState()
      .addCategory({ name: existing.name, color: existing.color });

    const categories = useCategoryStore
      .getState()
      .categories.filter((category) => category.name === existing.name);

    expect(result).toEqual(existing);
    expect(categories).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Category with name "${existing.name}" already exists.`,
      ),
    );
  });

  it('updates the color when adding an existing category with a new color', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    useCategoryStore
      .getState()
      .addCategory({ name: 'Transportation', color: '#ABCDEF' });

    const updated = useCategoryStore
      .getState()
      .categories.find((category) => category.name === 'Transportation');

    expect(updated?.color).toBe('#ABCDEF');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Category with name "Transportation" already exists.',
      ),
    );
  });

  it('prevents deleting every protected default category', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const defaultCategory = useCategoryStore.getState().categories[0];

    expect(defaultCategory).toBeDefined();

    useCategoryStore.getState().deleteCategory(defaultCategory.id);

    const categories = useCategoryStore.getState().categories;

    expect(categories).toContainEqual(defaultCategory);
    expect(warnSpy).toHaveBeenCalledWith(
      `Cannot delete the default category "${defaultCategory.name}".`,
    );
  });

  it('retrieves categories by name after updates', () => {
    const { addCategory, updateCategory, getCategoryByName } =
      useCategoryStore.getState();

    const created = addCategory({ name: 'Outdoors', color: '#123456' });
    expect(getCategoryByName('Outdoors')).toEqual(created);

    const updated = { ...created, color: '#654321' };
    updateCategory(updated);

    expect(getCategoryByName('Outdoors')?.color).toBe('#654321');
  });

  it('rejects changing a category to another category color', () => {
    const [first, second] = useCategoryStore.getState().categories;

    expect(() =>
      useCategoryStore
        .getState()
        .updateCategory({ ...second, color: first.color.toLowerCase() }),
    ).toThrow('already uses this color');
    expect(
      useCategoryStore
        .getState()
        .categories.find((category) => category.id === second.id)?.color,
    ).toBe(second.color);
  });

  it('prevents renaming the reserved Uncategorized category', () => {
    const uncategorized = useCategoryStore
      .getState()
      .categories.find((category) => category.name === 'Uncategorized');

    expect(uncategorized).toBeDefined();
    expect(() =>
      useCategoryStore.getState().updateCategory({
        ...uncategorized!,
        name: 'Something Else',
      }),
    ).toThrow('Uncategorized cannot be renamed');
    expect(
      useCategoryStore
        .getState()
        .categories.find((category) => category.id === uncategorized?.id)?.name,
    ).toBe('Uncategorized');
  });

  it('does not delete a custom category referenced by an active expense', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const category = useCategoryStore
      .getState()
      .addCategory({ name: 'Fitness', color: '#111111' });
    useExpenseStore.setState({
      expenses: [
        {
          id: 'expense-1',
          title: 'Gym',
          date: '2026-08-13',
          category: category.name,
          categoryId: category.id,
        },
      ],
    });

    useCategoryStore.getState().deleteCategory(category.id);

    expect(useCategoryStore.getState().categories).toContainEqual(category);
    expect(warnSpy).toHaveBeenCalledWith(
      `Cannot delete category "${category.name}" while active expenses use it.`,
    );
  });

  it('archives and restores a used custom category without rewriting expenses', () => {
    const category = useCategoryStore
      .getState()
      .addCategory({ name: 'Coffee', color: '#111111' });
    const expense = {
      id: 'expense-coffee',
      title: 'Flat white',
      date: '2026-08-25',
      category: category.name,
      categoryId: category.id,
    };
    useExpenseStore.setState({ expenses: [expense] });

    useCategoryStore.getState().archiveCategory(category.id);

    expect(
      useCategoryStore
        .getState()
        .categories.find(({ id }) => id === category.id)?.archivedAt,
    ).toEqual(expect.any(String));
    expect(useExpenseStore.getState().expenses[0]).toEqual(expense);

    useCategoryStore.getState().restoreCategory(category.id);
    expect(
      useCategoryStore
        .getState()
        .categories.find(({ id }) => id === category.id),
    ).not.toHaveProperty('archivedAt');
  });

  it('permanently deletes a custom category only when it is unused', () => {
    const category = useCategoryStore
      .getState()
      .addCategory({ name: 'Temporary', color: '#111111' });

    useCategoryStore.getState().deleteCategory(category.id);

    expect(
      useCategoryStore
        .getState()
        .categories.some(({ id }) => id === category.id),
    ).toBe(false);
  });
});
