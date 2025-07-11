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
import { render, screen } from '@superset-ui/core/spec';
import { AsyncEsmComponent } from '.';

const Placeholder = () => <span>Loading...</span>;

const AsyncComponent = ({ bold }: { bold: boolean }) => (
  <span style={{ fontWeight: bold ? 700 : 400 }}>AsyncComponent</span>
);

const ComponentPromise = new Promise(resolve =>
  setTimeout(() => resolve(AsyncComponent), 500),
);

test('renders without placeholder', async () => {
  const Component = AsyncEsmComponent(ComponentPromise);
  render(<Component showLoadingForImport={false} />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(await screen.findByText('AsyncComponent')).toBeInTheDocument();
});

test('renders with default placeholder', async () => {
  const Component = AsyncEsmComponent(ComponentPromise);
  render(<Component height={30} showLoadingForImport />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(await screen.findByText('AsyncComponent')).toBeInTheDocument();
});

test('renders with custom placeholder', async () => {
  const Component = AsyncEsmComponent(ComponentPromise, Placeholder);
  render(<Component showLoadingForImport />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(await screen.findByText('AsyncComponent')).toBeInTheDocument();
});

test('renders with custom props', async () => {
  const Component = AsyncEsmComponent(ComponentPromise, Placeholder);
  render(<Component showLoadingForImport bold />);
  const asyncComponent = await screen.findByText('AsyncComponent');
  expect(asyncComponent).toBeInTheDocument();
  expect(asyncComponent).toHaveStyle({ fontWeight: 700 });
});
