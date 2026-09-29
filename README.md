# Mailspring Package Tracker

A [Mailspring](https://getmailspring.com) plugin that spots package tracking
numbers in your email and puts a **Track on UPS →** button (or FedEx, USPS,
DHL…) right above the message. One click opens the carrier's tracking page with
the number already filled in.

Supports UPS, USPS, FedEx, DHL (Express and eCommerce), Amazon Logistics,
OnTrac, and S10 international postal numbers.

## Install

```sh
git clone https://github.com/kz6fittycent/mailspring-package-tracker.git
cd mailspring-package-tracker
npm install --omit=dev
```

Then in Mailspring choose **Developer → Install a Plugin…** and select the
`mailspring-package-tracker` folder.

Run `npm install` first: Mailspring does not install plugin dependencies itself,
so `node_modules` must be present when you install. Mailspring copies the folder
into its packages directory, so after pulling updates, install it again and
reload (**Developer → Reload**) or restart Mailspring.

## What you'll see

When a message contains a tracking number, a banner in your theme's accent color
appears above the body:

> 📦 This email has a tracking number. Click to track your package:
> **[Track on UPS →]** `1Z5R89390357567127` Copy

The button opens the carrier's page in your browser; **Copy** puts the number on
the clipboard. Messages without tracking numbers are unchanged.

## How detection works

Detection comes from
[ts-tracking-number](https://www.npmjs.com/package/ts-tracking-number), which
validates each carrier's checksum. On top of that, the plugin:

- **Guards against false positives.** FedEx and DHL Express numbers are just
  10–15 digits, so phone and order numbers often pass their checksums. Those
  matches are shown only when the carrier's name appears in the email. UPS
  (`1Z…`), Amazon (`TBA…`), 20+ digit USPS, and S10 numbers are distinctive
  enough to show without that check.
- **Credits DHL eCommerce correctly.** DHL eCommerce hands US packages to USPS
  for final delivery and emails a USPS-format number. When DHL is the sender or
  is named in the subject, that number links to DHL's tracking page instead of
  USPS's.
- **Reads links too.** Numbers that only appear inside a link, such as
  `ups.com/track?tracknum=1Z…`, are found.

## Development

```sh
npm install
npm test
```

The plugin is plain CommonJS using `React.createElement`, so there is no build
step.

| File | Purpose |
|---|---|
| `lib/main.js` | Registers the banner in Mailspring's `message:BodyHeader` slot |
| `lib/tracking-banner.js` | The banner UI |
| `lib/detect.js` | Detection logic and the `CARRIER_URLS` table of tracking pages |
| `styles/main.less` | Banner styling, using Mailspring's theme variables |
| `test/run.js` | Unit tests for `detect.js` |

If a carrier changes its tracking page URL, update `CARRIER_URLS` in
`lib/detect.js`.

## License

[MIT](LICENSE)
