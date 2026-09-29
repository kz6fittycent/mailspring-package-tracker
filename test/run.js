// Run with: npm test

'use strict';

var assert = require('assert');
var detect = require('../lib/detect');

function numbers(message) {
  return detect.findTrackingNumbers(message).map(function (r) {
    return r.number;
  });
}

var tests = {
  'finds UPS and USPS numbers without context': function () {
    var found = numbers({
      subject: 'Your order has shipped',
      body: '<p>UPS: <b>1Z5R89390357567127</b></p><p>9400111202555842332669</p>',
    });
    assert.deepStrictEqual(found.sort(), ['1Z5R89390357567127', '9400111202555842332669']);
  },

  'keeps numbers on adjacent lines separate': function () {
    var found = numbers({ body: '1Z5R89390357567127\n9400111202555842332669' });
    assert.deepStrictEqual(found.sort(), ['1Z5R89390357567127', '9400111202555842332669']);
  },

  'builds current carrier URLs': function () {
    var found = detect.findTrackingNumbers({ body: '1Z5R89390357567127' });
    assert.strictEqual(found[0].url, 'https://www.ups.com/track?tracknum=1Z5R89390357567127');
  },

  'finds numbers that only appear inside a link': function () {
    var found = numbers({
      body: '<a href="https://www.ups.com/track?tracknum=1Z5R89390357567127">Track it</a>',
    });
    assert.deepStrictEqual(found, ['1Z5R89390357567127']);
  },

  'ignores phone and order numbers when no weak-format carrier is named': function () {
    var found = numbers({
      subject: 'Receipt',
      body: 'Order #123456789012. Questions? Call 8005551212.',
    });
    assert.deepStrictEqual(found, []);
  },

  'accepts a FedEx number when the email mentions FedEx': function () {
    var found = numbers({
      from: [{ name: 'FedEx', email: 'TrackingUpdates@fedex.com' }],
      body: 'Tracking number 123456789012',
    });
    assert.deepStrictEqual(found, ['123456789012']);
  },

  'credits a USPS-format number to DHL when DHL sent the email': function () {
    var found = detect.findTrackingNumbers({
      from: [{ name: 'DHL eCommerce', email: 'noreply@dhl.com' }],
      subject: 'Your shipment is on its way',
      body: 'Tracking number: 9400111202555842332669',
    });
    assert.strictEqual(found.length, 1);
    assert.strictEqual(found[0].carrier, 'DHL');
    assert.strictEqual(
      found[0].url,
      'https://www.dhl.com/us-en/home/tracking.html?submit=1&tracking-id=9400111202555842332669'
    );
  },

  'keeps USPS numbers as USPS when DHL is only mentioned in the body': function () {
    var found = detect.findTrackingNumbers({
      from: [{ name: 'Some Store', email: 'orders@store.example' }],
      body: 'We ship with USPS or DHL. Tracking: 9400111202555842332669',
    });
    assert.strictEqual(found[0].carrier, 'United States Postal Service');
  },

  'reports each number once': function () {
    var found = numbers({
      body: '1Z5R89390357567127 <a href="https://ups.com/track?tracknum=1Z5R89390357567127">x</a>',
    });
    assert.deepStrictEqual(found, ['1Z5R89390357567127']);
  },

  'handles a message with no body': function () {
    assert.deepStrictEqual(numbers({ subject: 'hi' }), []);
  },
};

var failed = 0;
Object.keys(tests).forEach(function (name) {
  try {
    tests[name]();
    console.log('ok   ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + '\n     ' + e.message);
  }
});
process.exit(failed ? 1 : 0);
