# Security Notes

## Dependency audit — October 2026

The initial npm audit reported five high-severity findings
through the development dependency chain:

eslint-config-next -> @next/eslint-plugin-next
-> fast-glob -> micromatch -> braces

Advisory: GHSA-vfj7-8cjw-p6xm
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

The production dependency audit reported zero vulnerabilities.

At the time of review, the advisory did not identify a
patched version of braces. npm audit fix --force proposed
downgrading eslint-config-next to an incompatible major
version, so the downgrade was not applied.

Mitigations:
- Do not process untrusted glob patterns through lint tooling.
- Do not expose development tools through application endpoints.
- Recheck the advisory and dependency audit when updates
  become available.

This is an outstanding development-dependency issue,
not a resolved vulnerability.
