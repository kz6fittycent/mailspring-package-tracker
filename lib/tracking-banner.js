// tracking-banner.js — the in-message UI.
// Registered for the 'message:BodyHeader' role, so Mailspring renders one
// instance above each message body and passes { message }.
//
// Written with React.createElement (no JSX) so the plugin runs with no build.

'use strict';

var mailspring = require('mailspring-exports');
var React = mailspring.React;
var electron = require('electron');

var detect = require('./detect');

var h = React.createElement;

class TrackingBanner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { copied: null };
  }

  _open(url) {
    electron.shell.openExternal(url);
  }

  _copy(number) {
    electron.clipboard.writeText(number);
    this.setState({ copied: number });
    clearTimeout(this._copyTimer);
    this._copyTimer = setTimeout(() => this.setState({ copied: null }), 1500);
  }

  componentWillUnmount() {
    clearTimeout(this._copyTimer);
  }

  render() {
    var message = this.props.message;
    if (!message || message.draft) return null;

    var found;
    try {
      found = detect.findTrackingNumbers(message);
    } catch (e) {
      console.error('[PackageTracker]', e);
      return null;
    }
    if (!found.length) return null;

    return h(
      'div',
      { className: 'package-tracker-banner' },
      h(
        'div',
        { className: 'package-tracker-label' },
        h('span', { className: 'package-tracker-icon' }, '📦'),
        found.length === 1
          ? 'This email has a tracking number. Click to track your package:'
          : 'This email has ' + found.length + ' tracking numbers. Click to track your packages:'
      ),
      found.map((item) =>
        h(
          'div',
          { key: item.number, className: 'package-tracker-item' },
          h(
            'button',
            {
              className: 'btn btn-emphasis package-tracker-open',
              title: item.service + ' — opens ' + item.url,
              onClick: () => this._open(item.url),
            },
            'Track on ' + item.carrier + ' →'
          ),
          h('span', { className: 'package-tracker-number' }, item.number),
          h(
            'a',
            {
              className: 'package-tracker-copy',
              title: 'Copy tracking number',
              onClick: () => this._copy(item.number),
            },
            this.state.copied === item.number ? 'Copied' : 'Copy'
          )
        )
      )
    );
  }
}

TrackingBanner.displayName = 'TrackingBanner';

module.exports = TrackingBanner;
