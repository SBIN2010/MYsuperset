/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  fireEvent,
  render,
  screen,
  selectOption,
} from 'spec/helpers/testing-library';
import userEvent from '@testing-library/user-event';
import HeaderGroupsControl from './HeaderGroupsControl';
import { HeaderGroupConfig } from './types';

const columnOptions = [
  { value: 'SUM(sales)', label: 'SUM(sales)' },
  { value: 'AVG(sales)', label: 'AVG(sales)' },
  { value: 'SUM(cost)', label: 'SUM(cost)' },
];

const createGroup = (
  overrides: Partial<HeaderGroupConfig> = {},
): HeaderGroupConfig => ({
  id: overrides.id ?? 'group-1',
  label: overrides.label ?? 'Sales',
  columns: overrides.columns ?? ['SUM(sales)'],
  labelAlign: overrides.labelAlign ?? 'center',
  placement: overrides.placement ?? 'right',
  children: overrides.children ?? [],
  ...overrides,
});

const baseProps = {
  name: 'header_groups',
  label: 'Column groups',
  type: 'HeaderGroupsControl' as const,
  actions: { setControlValue: jest.fn() },
  columnOptions,
};

test('opens the add popover immediately without creating a group', async () => {
  const onChange = jest.fn();
  render(<HeaderGroupsControl {...baseProps} value={[]} onChange={onChange} />);

  await userEvent.click(screen.getByText('Add group'));

  expect(screen.getByLabelText('Group name')).toBeInTheDocument();
  expect(screen.getByText('Table side')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test('disables Apply until the group has a name and a column', async () => {
  const onChange = jest.fn();
  render(<HeaderGroupsControl {...baseProps} value={[]} onChange={onChange} />);

  await userEvent.click(screen.getByText('Add group'));

  const apply = screen.getByRole('button', { name: 'Apply' });
  expect(apply).toBeDisabled();

  await userEvent.type(screen.getByLabelText('Group name'), 'Sales');
  expect(apply).toBeDisabled();
  await userEvent.click(apply);
  expect(onChange).not.toHaveBeenCalled();

  await selectOption('SUM(sales)', 'Group columns');
  expect(apply).toBeEnabled();
});

test('saves a new group from the add popover', async () => {
  const onChange = jest.fn();
  render(<HeaderGroupsControl {...baseProps} value={[]} onChange={onChange} />);

  await userEvent.click(screen.getByText('Add group'));
  await userEvent.type(screen.getByLabelText('Group name'), 'Sales');
  await selectOption('SUM(sales)', 'Group columns');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(onChange).toHaveBeenCalled();
  const nextGroups = onChange.mock.calls.at(-1)?.[0] as HeaderGroupConfig[];
  expect(nextGroups[0].label).toBe('Sales');
  expect(nextGroups[0].columns).toEqual(['SUM(sales)']);
});

test('disables adding a subgroup when no columns are selected', async () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[createGroup({ columns: [] })]}
      onChange={onChange}
    />,
  );

  await userEvent.click(screen.getByText('Group 1'));

  expect(screen.getByRole('button', { name: /Add subgroup/ })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: /Add subgroup/ }));
  expect(onChange).not.toHaveBeenCalled();
});

test('disables adding a subgroup when the group name is empty', async () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[createGroup({ label: '' })]}
      onChange={onChange}
    />,
  );

  await userEvent.click(screen.getByText('Group 1'));

  expect(screen.getByRole('button', { name: /Add subgroup/ })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: /Add subgroup/ }));
  expect(onChange).not.toHaveBeenCalled();
});

test('renders existing groups as numbered labels and edits them in a popover', async () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[createGroup()]}
      onChange={onChange}
    />,
  );

  expect(screen.getByText('Group 1')).toBeInTheDocument();
  expect(screen.queryByText('Group 1: Sales')).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue('Sales')).not.toBeInTheDocument();

  await userEvent.click(screen.getByText('Group 1'));

  expect(screen.getByDisplayValue('Sales')).toBeInTheDocument();
  expect(screen.getByText('Label position')).toBeInTheDocument();
  expect(screen.getByText('Table side')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Add subgroup/ }));

  expect(onChange).toHaveBeenCalled();
  const nextGroups = onChange.mock.calls.at(-1)?.[0] as HeaderGroupConfig[];
  expect(nextGroups[0].children).toHaveLength(1);
});

test('locks columns on automatically created time comparison groups', async () => {
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[
        createGroup({
          id: 'time-compare-sales',
          source: 'time_compare',
          columns: [
            'Main SUM(sales)',
            '# SUM(sales)',
            '△ SUM(sales)',
            '% SUM(sales)',
          ],
        }),
      ]}
    />,
  );

  await userEvent.click(screen.getByText('Group 1'));

  expect(
    screen
      .getByRole('combobox', { name: 'Group columns' })
      .closest('.ant-select'),
  ).toHaveClass('ant-select-disabled');
  expect(
    screen.queryByRole('button', { name: /Add subgroup/ }),
  ).not.toBeInTheDocument();
});

test('removes stale time comparison groups when they are no longer provided', () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[
        createGroup({
          id: 'time-compare-sales',
          source: 'time_compare',
          columns: ['Main SUM(sales)'],
        }),
        createGroup({
          id: 'custom',
          label: 'Custom',
          columns: ['SUM(cost)'],
        }),
      ]}
      timeComparisonGroups={[]}
      onChange={onChange}
    />,
  );

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'custom' }),
  ]);
});

test('does not sync groups when onChange is omitted', () => {
  expect(() =>
    render(
      <HeaderGroupsControl
        {...baseProps}
        value={[]}
        timeComparisonGroups={[
          {
            id: 'time-compare-sales',
            label: 'Sales',
            columns: ['Main SUM(sales)'],
            source: 'time_compare',
          },
        ]}
      />,
    ),
  ).not.toThrow();
});

test('syncs time comparison groups when column options are empty', () => {
  const onChange = jest.fn();
  const timeComparisonGroups: HeaderGroupConfig[] = [
    {
      id: 'time-compare-sales',
      label: 'Sales',
      columns: ['Main SUM(sales)'],
      source: 'time_compare',
    },
  ];

  render(
    <HeaderGroupsControl
      {...baseProps}
      columnOptions={[]}
      value={[]}
      timeComparisonGroups={timeComparisonGroups}
      onChange={onChange}
    />,
  );

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'time-compare-sales' }),
  ]);
});

test('edits name, columns, alignment, and placement from the popover', async () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[createGroup()]}
      onChange={onChange}
    />,
  );

  await userEvent.click(screen.getByText('Group 1'));

  fireEvent.change(screen.getByLabelText('Group name'), {
    target: { value: 'Revenue' },
  });

  await selectOption('AVG(sales)', 'Group columns');
  await userEvent.click(screen.getAllByRole('radio', { name: 'Left' })[0]);
  await userEvent.click(screen.getAllByRole('radio', { name: 'Left' })[1]);

  const payloads = onChange.mock.calls.map(
    ([next]) => next as HeaderGroupConfig[],
  );
  expect(payloads.some(groups => groups[0].label.includes('Revenue'))).toBe(
    true,
  );
  expect(
    payloads.some(groups => groups[0].columns.includes('AVG(sales)')),
  ).toBe(true);
  expect(payloads.some(groups => groups[0].labelAlign === 'left')).toBe(true);
  expect(payloads.some(groups => groups[0].placement === 'left')).toBe(true);
});

test('removes a group from the list', async () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[createGroup(), createGroup({ id: 'group-2', label: 'Cost' })]}
      onChange={onChange}
    />,
  );

  await userEvent.click(screen.getAllByLabelText('Remove group')[0]);

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'group-2' }),
  ]);
});

test('removes a nested subgroup from the edit popover', async () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[
        createGroup({
          children: [
            createGroup({
              id: 'child',
              label: 'Online',
              columns: ['SUM(cost)'],
            }),
          ],
        }),
      ]}
      onChange={onChange}
    />,
  );

  await userEvent.click(screen.getByText('Group 1'));
  expect(screen.getByText('Subgroup 1.1')).toBeInTheDocument();

  await userEvent.click(screen.getAllByLabelText('Remove group')[1]);

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({ children: [] }),
  ]);
});

test('adds a subgroup in the add popover before Apply', async () => {
  const onChange = jest.fn();
  render(<HeaderGroupsControl {...baseProps} value={[]} onChange={onChange} />);

  await userEvent.click(screen.getByText('Add group'));
  await userEvent.type(screen.getByLabelText('Group name'), 'Sales');
  await selectOption('SUM(sales)', 'Group columns');
  await userEvent.click(screen.getByRole('button', { name: /Add subgroup/ }));

  expect(screen.getByText('Subgroup 1.1')).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

  const nextGroups = onChange.mock.calls.at(-1)?.[0] as HeaderGroupConfig[];
  expect(nextGroups[0].children).toHaveLength(1);
});

test('creates time comparison groups when they are provided', () => {
  const onChange = jest.fn();
  const timeComparisonGroups: HeaderGroupConfig[] = [
    {
      id: 'time-compare-sales',
      label: 'Sales',
      columns: [
        'Main SUM(sales)',
        '# SUM(sales)',
        '△ SUM(sales)',
        '% SUM(sales)',
      ],
      source: 'time_compare',
    },
  ];

  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[]}
      timeComparisonGroups={timeComparisonGroups}
      onChange={onChange}
    />,
  );

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({
      id: 'time-compare-sales',
      source: 'time_compare',
      columns: timeComparisonGroups[0].columns,
    }),
  ]);
});

test('removes stale columns that are no longer available', () => {
  const onChange = jest.fn();
  render(
    <HeaderGroupsControl
      {...baseProps}
      value={[createGroup({ columns: ['SUM(sales)', 'missing_col'] })]}
      onChange={onChange}
    />,
  );

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({
      columns: ['SUM(sales)'],
    }),
  ]);
});
