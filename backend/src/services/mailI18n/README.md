# mail-i18n — Shenhai B2X transactional email translation

- 72 canonical languages (`mail-catalog.json`, 11 strings each, placeholders validated). Native review recommended for: kl, tet, dv, cnr.
- `territory-languages.json`: primary language per canonical territory (205), from the Localization JSONB v8.
- `install({ app })` hooks nodemailer once per process. Verification, sign-in code, password reset and receipt emails get a localised subject and lead paragraph; the original message is kept below. Other emails and English recipients are unchanged.
- Language: user's saved language → user's territory primary language → `MAIL_DEFAULT_LANG` → unchanged (English).
- Env: `MAIL_I18N_DISABLED=true` turns it off; `MAIL_I18N_FORCE_LANG=xx` forces a language (testing only).
