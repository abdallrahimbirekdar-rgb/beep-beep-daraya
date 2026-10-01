# Shahin transactional email setup

Status: email templates prepared; Brevo account, verified sender and SMTP connection still required. Customer registration stays disabled until a real signup confirmation and password recovery email both work.

## Connection

- Provider: Brevo Free (daily quota must be verified in the account).
- SMTP host: smtp-relay.brevo.com
- Port: 587 (STARTTLS)
- Username: the exact Login shown in Brevo SMTP & API settings.
- Password: a Brevo SMTP key, never the account password or an API key.
- Sender name: شاهين
- Sender email: a sender verified by the account owner; use an authenticated owned domain for reliable long-term delivery.
- Keep keys only in Supabase SMTP settings; never commit them or place them in browser code.
- Keep email confirmation enabled, disable email link tracking for authentication messages, and retain existing login rate limits.

## Supabase email templates

After SMTP is configured, use confirm-signup.html for Confirm signup (subject: تأكيد حسابك في شاهين) and reset-password.html for Reset password (subject: استعادة كلمة مرور شاهين). Both use the Supabase ConfirmationURL template variable.

Allowed callback: https://abdallrahimbirekdar-rgb.github.io/beep-beep-daraya/index.html#account

Verify confirmation links establish the correct customer session; verify reset links show the password recovery form. Test delivery to Gmail and Outlook with owner-approved addresses. Only then set customerRegistrationReady to true in config.js and publish the changed config with a new cache version.

The setup does not configure promotional emails or paid plans.
