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
import PropTypes from 'prop-types';
import { ColumnOption, MetricOption } from '@superset-ui/chart-controls';

import AggregateOption from 'src/injections/explore/components/AggregateOption';
import columnType from 'src/injections/explore/propTypes/columnType';
import aggregateOptionType from 'src/injections/explore/propTypes/aggregateOptionType';
import withToasts from 'src/features/messageToasts/enhancers/withToasts';
import savedMetricType from './savedMetricType';

const propTypes = {
  option: PropTypes.oneOfType([
    columnType,
    savedMetricType,
    aggregateOptionType,
  ]).isRequired,
  addWarningToast: PropTypes.func.isRequired,
};

function MetricDefinitionOption({ option, addWarningToast }) {
  if (option.metric_name) {
    return <MetricOption metric={option} showType />;
  }
  if (option.column_name) {
    return <ColumnOption column={option} showType />;
  }
  if (option.aggregate_name) {
    return <AggregateOption aggregate={option} showType />;
  }
  addWarningToast(
    'You must supply either a saved metric, column or aggregate to MetricDefinitionOption',
  );
  return null;
}

MetricDefinitionOption.propTypes = propTypes;

export default withToasts(MetricDefinitionOption);
