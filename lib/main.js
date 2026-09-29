// main.js — plugin entry point.
// Registers a banner above each message body listing any package tracking
// numbers found in that message, with links to the carrier's tracking page.

'use strict';

var ComponentRegistry = require('mailspring-exports').ComponentRegistry;

var TrackingBanner = require('./tracking-banner');

function activate() {
  ComponentRegistry.register(TrackingBanner, { role: 'message:BodyHeader' });
}

function serialize() {}

function deactivate() {
  ComponentRegistry.unregister(TrackingBanner);
}

module.exports = {
  activate: activate,
  serialize: serialize,
  deactivate: deactivate,
};
