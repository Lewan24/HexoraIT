# Email and notification API

API `2.0.0` adds SMTP administration, per-organization notification preferences, account email confirmation, and email-based password reset. It is a new major contract because registration now returns `202` without issuing a session until the email address is confirmed. The application release is `v1.3.0`.

## Authentication flows

| Method | Path | Access | Result |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public, rate limited | `202`; sends a 24-hour confirmation link when registration is enabled. No session is issued before confirmation. |
| `POST` | `/api/auth/confirm-email` | Public, rate limited | Consumes a single-use confirmation token. |
| `POST` | `/api/auth/forgot-password` | Public, rate limited | Always returns `202` to prevent account enumeration; sends a one-hour link for an eligible account. |
| `POST` | `/api/auth/reset-password` | Public, rate limited | Consumes a single-use token, changes the password, and revokes existing access tokens via the security stamp. |

Only SHA-256 token hashes are stored. Tokens are generated with 256 bits of cryptographic randomness, expire, and cannot be reused.

## Global SMTP settings

All routes require the `AdminOnly` policy:

- `GET /api/admin/email-settings`
- `PUT /api/admin/email-settings`
- `POST /api/admin/email-settings/test`

The SMTP password is protected with ASP.NET Core Data Protection. Read responses expose only `hasPassword`; the secret is never returned. Omitting `password` preserves the stored secret, while an empty string clears it. Disabling the global service stops all account and organization email delivery.

## Organization preferences

`GET` and `PUT /api/organizations/{organizationId}/notification-settings` require an organization `Owner` or `Admin`. Preferences cover:

- licenses, contracts, and warranties ending within the configured warning window;
- tasks created by client accounts;
- new incidents;
- role and membership changes.

Event recipients are distinct active, unblocked, email-confirmed members of the same organization. The daily expiry scanner records a unique delivery marker per organization, event, resource, and effective date to prevent duplicate reminders.
