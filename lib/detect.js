// detect.js — finds package tracking numbers in a Mailspring message.
// Pure functions with no Mailspring dependencies, so they can be unit tested
// with plain node (see test/run.js).

'use strict';

var tracking = require('ts-tracking-number');

// Current carrier tracking pages, keyed by ts-tracking-number courier code.
// These override the library's built-in URLs, several of which are outdated.
// %s is replaced with the tracking number.
var CARRIER_URLS = {
  ups: 'https://www.ups.com/track?tracknum=%s',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr=%s',
  usps: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=%s',
  // DHL's combined tracking page, which covers Express and eCommerce numbers.
  dhl: 'https://www.dhl.com/us-en/home/tracking.html?submit=1&tracking-id=%s',
  amazon: 'https://track.amazon.com/tracking/%s',
};

// Used when neither the table above nor the library has a URL for a carrier.
var FALLBACK_URL = 'https://t.17track.net/en#nums=%s';

// Words that must appear somewhere in the email before we trust a match from a
// carrier whose number format is just a short run of digits. Without this,
// phone numbers and order numbers regularly pass the FedEx and DHL checksums.
var CARRIER_KEYWORDS = {
  fedex: /fed\s?ex/i,
  dhl: /\bdhl\b/i,
  ontrac: /ontrac/i,
};

// Carriers that hand packages to USPS for final delivery and send the customer
// a USPS-format number. When one of these carriers is the sender (or is named
// in the subject), a USPS match is credited to them and links to their site.
var USPS_HANDOFF_CARRIERS = [{ code: 'dhl', name: 'DHL', service: 'DHL eCommerce', pattern: /\bdhl\b/i }];

// Formats distinctive enough to accept without any supporting context:
// UPS "1Z...", Amazon "TBA...", 20+ digit USPS numbers, and S10 international
// numbers like "LZ123456789US".
function isDistinctive(match) {
  var code = match.courier.code;
  var num = match.trackingNumber;
  if (code === 'ups' || code === 'amazon' || code === 's10') return true;
  if (code === 'usps') return num.length >= 20;
  return false;
}

function htmlToText(html) {
  // Keep link targets: many shipping emails only put the number inside an
  // href like "...track?tracknum=1Z...".
  var hrefs = [];
  html.replace(/href\s*=\s*["']([^"']+)["']/gi, function (_, href) {
    try {
      hrefs.push(decodeURIComponent(href));
    } catch (e) {
      hrefs.push(href);
    }
  });

  // ts-tracking-number allows whitespace inside a number ("1Z 5R8 939 ..."),
  // so two numbers separated only by whitespace get merged into one bad match.
  // Tag boundaries and line breaks therefore become a non-space separator.
  var SEP = ' | ';
  var text = html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, SEP)
    .replace(/<[^>]+>/g, SEP)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, function (_, n) {
      return String.fromCharCode(Number(n));
    });

  // Separate URL parameters so "tracknum=1Z..." tokenizes cleanly.
  var links = hrefs.join(SEP).replace(/[?&=#/]/g, ' ');
  return (text + SEP + links).replace(/\s*[\r\n]+\s*/g, SEP);
}

function urlFor(code, match) {
  var template = CARRIER_URLS[code] || match.trackingUrl || FALLBACK_URL;
  return template.replace('%s', encodeURIComponent(match.trackingNumber));
}

function handoffCarrier(match, senderAndSubject) {
  if (match.courier.code !== 'usps') return null;
  for (var i = 0; i < USPS_HANDOFF_CARRIERS.length; i++) {
    if (USPS_HANDOFF_CARRIERS[i].pattern.test(senderAndSubject)) return USPS_HANDOFF_CARRIERS[i];
  }
  return null;
}

// Returns [{ number, carrier, service, url }] for each unique tracking number
// found in the message's subject, sender and body.
function findTrackingNumbers(message) {
  if (!message) return [];

  var from = (message.from || [])
    .map(function (c) {
      return (c.name || '') + ' ' + (c.email || '');
    })
    .join(' ');
  var senderAndSubject = (message.subject || '') + ' | ' + from;
  var text = senderAndSubject + ' | ' + htmlToText(message.body || '');

  var seen = {};
  var results = [];
  (tracking.findTracking(text) || []).forEach(function (match) {
    var code = match.courier.code;
    var keyword = CARRIER_KEYWORDS[code];
    if (!isDistinctive(match) && !(keyword && keyword.test(text))) return;
    if (seen[match.trackingNumber]) return;
    seen[match.trackingNumber] = true;

    var handoff = handoffCarrier(match, senderAndSubject);
    results.push({
      number: match.trackingNumber,
      carrier: handoff ? handoff.name : match.courier.name,
      service: handoff ? handoff.service : match.name,
      url: urlFor(handoff ? handoff.code : match.courier.code, match),
    });
  });
  return results;
}

module.exports = {
  findTrackingNumbers: findTrackingNumbers,
  htmlToText: htmlToText,
};
