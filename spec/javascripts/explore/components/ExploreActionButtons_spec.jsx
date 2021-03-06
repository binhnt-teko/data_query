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
import React from 'react';
import { shallow } from 'enzyme';
import { mockStore } from 'spec/fixtures/mockStore';
import ExploreActionButtons from 'src/injections/explore/components/ExploreActionButtons';

describe('ExploreActionButtons', () => {
  const defaultProps = {
    actions: {},
    canDownload: 'True',
    latestQueryFormData: {},
    queryEndpoint: 'localhost',
    chartHeight: '30px',
  };

  it('renders', () => {
    expect(
      React.isValidElement(<ExploreActionButtons {...defaultProps} />),
    ).toBe(true);
  });

  it('should render 6 children/buttons', () => {
    const wrapper = shallow(
      <ExploreActionButtons {...defaultProps} store={mockStore} />,
    );
    expect(wrapper.dive().children()).toHaveLength(6);
  });
});
