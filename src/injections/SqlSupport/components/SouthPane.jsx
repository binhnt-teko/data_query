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
import shortid from 'shortid';
import Alert from 'src/components/Alert';
import Tabs from 'src/common/components/Tabs';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { t, styled } from '@superset-ui/core';

import { isFeatureEnabled, FeatureFlag } from 'src/bootstrap/featureFlags';

import Label from 'src/components/Label';
import * as Actions from '../actions/sqlSupport';
import QueryHistory from './QueryHistory';
import ResultSet from './ResultSet';
import {
  STATUS_OPTIONS,
  STATE_TYPE_MAP,
  LOCALSTORAGE_MAX_QUERY_AGE_MS,
} from '../constants';

const TAB_HEIGHT = 64;

/*
    editorQueries are queries executed by users passed from SqlEditor component
    dataPrebiewQueries are all queries executed for preview of table data (from SqlEditorLeft)
*/
const propTypes = {
  editorQueries: PropTypes.array.isRequired,
  latestQueryId: PropTypes.string,
  dataPreviewQueries: PropTypes.array.isRequired,
  actions: PropTypes.object.isRequired,
  activeSouthPaneTab: PropTypes.string,
  height: PropTypes.number,
  databases: PropTypes.object.isRequired,
  offline: PropTypes.bool,
  displayLimit: PropTypes.number.isRequired,
};

const defaultProps = {
  activeSouthPaneTab: 'Results',
  offline: false,
};

const StyledPane = styled.div`
  width: 100%;

  .ant-tabs .ant-tabs-content-holder {
    overflow: visible;
  }
  .SouthPaneTabs {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .tab-content {
    overflow: hidden;
    .alert {
      margin-top: ${({ theme }) => theme.gridUnit * 2}px;
    }

    button.fetch {
      margin-top: ${({ theme }) => theme.gridUnit * 2}px;
    }
  }
`;

export class SouthPane extends React.PureComponent {
  constructor(props) {
    super(props);
    this.southPaneRef = React.createRef();
    this.switchTab = this.switchTab.bind(this);
  }

  switchTab(id) {
    this.props.actions.setActiveSouthPaneTab(id);
  }

  render() {
    if (this.props.offline) {
      return (
        <Label className="m-r-3" type={STATE_TYPE_MAP[STATUS_OPTIONS.offline]}>
          {STATUS_OPTIONS.offline}
        </Label>
      );
    }
    const innerTabContentHeight = this.props.height - TAB_HEIGHT;
    let latestQuery;
    const { props } = this;
    if (props.editorQueries.length > 0) {
      // get the latest query
      latestQuery = props.editorQueries.find(
        q => q.id === this.props.latestQueryId,
      );
    }
    let results;
    if (latestQuery) {
      if (
        isFeatureEnabled(FeatureFlag.SQLLAB_BACKEND_PERSISTENCE) &&
        latestQuery.state === 'success' &&
        !latestQuery.resultsKey &&
        !latestQuery.results
      ) {
        results = (
          <Alert
            type="warning"
            message={t(
              'No stored results found, you need to re-run your query',
            )}
          />
        );
      } else if (
        Date.now() - latestQuery.startDttm <=
        LOCALSTORAGE_MAX_QUERY_AGE_MS
      ) {
        results = (
          <ResultSet
            showControls
            search
            query={latestQuery}
            actions={props.actions}
            height={innerTabContentHeight}
            database={this.props.databases[latestQuery.dbId]}
            displayLimit={this.props.displayLimit}
          />
        );
      }
    } else {
      results = (
        <Alert type="info" message={t('Run a query to display results here')} />
      );
    }
    const dataPreviewTabs = props.dataPreviewQueries.map(query => (
      <Tabs.TabPane
        tab={t('Preview: `%s`', decodeURIComponent(query.tableName))}
        key={query.id}
      >
        <ResultSet
          query={query}
          visualize={false}
          csv={false}
          actions={props.actions}
          cache
          height={innerTabContentHeight}
          displayLimit={this.props.displayLimit}
        />
      </Tabs.TabPane>
    ));

    return (
      <StyledPane className="SouthPane" ref={this.southPaneRef}>
        <Tabs
          activeKey={this.props.activeSouthPaneTab}
          className="SouthPaneTabs"
          onChange={this.switchTab}
          id={shortid.generate()}
          fullWidth={false}
        >
          <Tabs.TabPane tab={t('Results')} key="Results">
            {results}
          </Tabs.TabPane>
          <Tabs.TabPane tab={t('Query history')} key="History">
            <QueryHistory
              queries={props.editorQueries}
              actions={props.actions}
              displayLimit={props.displayLimit}
            />
          </Tabs.TabPane>
          {
            dataPreviewTabs
          }
        </Tabs>
      </StyledPane>
    );
  }
}

function mapStateToProps({ sqlSupport }) {
  return {
    activeSouthPaneTab: sqlSupport.activeSouthPaneTab,
    databases: sqlSupport.databases,
    offline: sqlSupport.offline,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(Actions, dispatch),
  };
}

SouthPane.propTypes = propTypes;
SouthPane.defaultProps = defaultProps;

export default connect(mapStateToProps, mapDispatchToProps)(SouthPane);
