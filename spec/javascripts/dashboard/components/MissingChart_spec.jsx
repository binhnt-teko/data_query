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

import MissingChart from 'src/injections/dashboard/components/MissingChart';

describe('MissingChart', () => {
  function setup(overrideProps) {
    const wrapper = shallow(<MissingChart height={100} {...overrideProps} />);
    return wrapper;
  }

  it('renders a .missing-chart-container', () => {
    const wrapper = setup();
    expect(wrapper.find('.missing-chart-container')).toExist();
  });

  it('renders a .missing-chart-body', () => {
    const wrapper = setup();
    expect(wrapper.find('.missing-chart-body')).toExist();
  });
});
