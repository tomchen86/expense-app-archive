import React, {
  createRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useExpenseModals } from '../useExpenseModals';
import { useCategoryStore } from '../../store/features/categoryStore';
import type { ExpenseGroup, Participant } from '../../types';

// Expo router is already mocked in jest.setup.unit.ts
import { router } from 'expo-router';

type HookHandle = {
  hookValue: ReturnType<typeof useExpenseModals>;
  getFormState: () => {
    category: 'Food & Dining';
    selectedGroup: ExpenseGroup | null;
    paidByParticipant: Participant | null;
    selectedParticipants: Participant[];
  };
};

const buildHarness = (
  initialParticipants: Participant[],
  initialGroup: ExpenseGroup | null = null,
) => {
  const participants = initialParticipants;
  const initialState = {
    category: 'Food & Dining' as const,
    selectedGroup: initialGroup,
    paidByParticipant: null,
    selectedParticipants: [] as Participant[],
  };

  return forwardRef<HookHandle>((_, ref) => {
    const [formState, setFormState] = useState(initialState);
    const hookValue = useExpenseModals({
      formState,
      participants,
      handleUpdateFormState: (field, value) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
      },
      setFormState,
    });

    useImperativeHandle(
      ref,
      () => ({ hookValue, getFormState: () => formState }),
      [hookValue, formState],
    );
    return null;
  });
};

describe('useExpenseModals', () => {
  const participants: Participant[] = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];

  const group: ExpenseGroup = {
    id: 'g1',
    name: 'Trip',
    participants,
    createdAt: '2025-02-01',
  };

  beforeEach(() => {
    useCategoryStore.setState({
      categories: [
        {
          id: '2f5833c5-6584-460e-89db-b15556599b49',
          name: 'Hydrated custom',
          color: '#102030',
        },
      ],
    });
  });

  it('derives category options from the hydrated category store', () => {
    const Harness = buildHarness(participants);
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });

    expect(ref.current!.hookValue.categoryModalData).toEqual([
      'Hydrated custom',
      ref.current!.hookValue.ADD_NEW_CATEGORY_ACTION,
    ]);
  });

  it('keeps archived categories out of new expense choices', () => {
    useCategoryStore.setState({
      categories: [
        {
          id: 'active-category',
          name: 'Active',
          color: '#102030',
        },
        {
          id: 'archived-category',
          name: 'Archived',
          color: '#405060',
          archivedAt: '2026-08-25T00:00:00.000Z',
        },
      ],
    });
    const Harness = buildHarness(participants);
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });

    expect(ref.current!.hookValue.categoryModalData).toEqual([
      'Active',
      ref.current!.hookValue.ADD_NEW_CATEGORY_ACTION,
    ]);
  });

  it('keeps personal and group category ownership within its ledger', () => {
    useCategoryStore.setState({
      categories: [
        {
          id: 'system-category',
          name: 'System',
          color: '#102030',
          scopeKind: 'system',
        },
        {
          id: 'personal-category',
          name: 'Personal Only',
          color: '#405060',
          scopeKind: 'personal',
        },
        {
          id: 'group-category',
          name: 'Trip Only',
          color: '#708090',
          scopeKind: 'group',
          spaceId: group.id,
        },
        {
          id: 'other-group-category',
          name: 'Other Group',
          color: '#A0B0C0',
          scopeKind: 'group',
          spaceId: 'g2',
        },
      ],
    });
    const PersonalHarness = buildHarness(participants);
    const GroupHarness = buildHarness(participants, group);
    const personalRef = createRef<HookHandle>();
    const groupRef = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<PersonalHarness ref={personalRef} />);
      TestRenderer.create(<GroupHarness ref={groupRef} />);
    });

    expect(personalRef.current!.hookValue.categoryModalData).toEqual([
      'System',
      'Personal Only',
      personalRef.current!.hookValue.ADD_NEW_CATEGORY_ACTION,
    ]);
    expect(groupRef.current!.hookValue.categoryModalData).toEqual([
      'System',
      'Trip Only',
      groupRef.current!.hookValue.ADD_NEW_CATEGORY_ACTION,
    ]);
  });

  it('removes a deleted category from an already mounted expense selector', () => {
    useCategoryStore.setState({
      categories: [
        {
          id: '2f5833c5-6584-460e-89db-b15556599b49',
          name: 'Hydrated custom',
          color: '#102030',
        },
        {
          id: 'b4f5e0bb-a645-49bd-9d36-a6af406f54c9',
          name: 'Delete me',
          color: '#405060',
        },
      ],
    });
    const Harness = buildHarness(participants);
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });
    expect(ref.current!.hookValue.categoryModalData).toContain('Delete me');

    act(() => {
      useCategoryStore.setState((state) => ({
        categories: state.categories.filter(
          (category) => category.name !== 'Delete me',
        ),
      }));
    });

    expect(ref.current!.hookValue.categoryModalData).toEqual([
      'Hydrated custom',
      ref.current!.hookValue.ADD_NEW_CATEGORY_ACTION,
    ]);
  });

  it('sets and clears group selections and dependent fields', () => {
    const Harness = buildHarness(participants);
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });

    act(() => {
      ref.current!.hookValue.setShowGroupModal(true);
      ref.current!.hookValue.handleGroupSelect(group);
    });

    expect(ref.current!.getFormState().selectedGroup).toEqual(group);
    act(() => {
      ref.current!.hookValue.handleGroupClear();
    });
    expect(ref.current!.getFormState().selectedGroup).toBeNull();
    expect(ref.current!.getFormState().selectedParticipants).toHaveLength(0);
  });

  it('toggles participants in split selections', () => {
    const Harness = buildHarness(participants, group);
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });

    const participant = participants[0];

    act(() => {
      ref.current!.hookValue.handleParticipantSelect(participant);
    });
    expect(ref.current!.getFormState().selectedParticipants).toEqual([
      participant,
    ]);

    act(() => {
      ref.current!.hookValue.handleParticipantSelect(participant);
    });
    expect(ref.current!.getFormState().selectedParticipants).toEqual([]);
  });

  it('navigates to category management when add-new action selected', () => {
    const Harness = buildHarness(participants);
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });

    act(() => {
      ref.current!.hookValue.handleCategorySelect(
        ref.current!.hookValue.ADD_NEW_CATEGORY_ACTION,
      );
    });

    expect(router.push).toHaveBeenCalledWith('/manage-categories');
  });

  it('opens category management in the selected group ownership scope', () => {
    const Harness = buildHarness(participants, group);
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });
    act(() => {
      ref.current!.hookValue.handleCategorySelect(
        ref.current!.hookValue.ADD_NEW_CATEGORY_ACTION,
      );
    });

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/manage-categories',
      params: { scopeKind: 'group', spaceId: group.id },
    });
  });
});
