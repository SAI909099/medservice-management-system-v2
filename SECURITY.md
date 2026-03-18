# Security Policy

## Supported Versions
This project is under active development. Security fixes are applied to the latest `main` branch.

## Reporting a Vulnerability
If you find a security issue:
1. Do not open a public issue with exploit details.
2. Share a private report with:
   - impact summary
   - reproduction steps
   - affected endpoints/modules
3. Include logs/screenshots if possible.

## Secrets and Credentials
- Never commit `.env` files or private keys.
- Rotate secrets if accidentally exposed.
- Use GitHub Actions Secrets for CI/CD credentials.
