# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report them privately via [GitHub's private vulnerability reporting](https://github.com/fooey/gw2w2w-cloudflare/security/advisories/new).

Include as much detail as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any suggested fix if you have one

You can expect an acknowledgement within 48 hours. If the vulnerability is confirmed, a fix will be prioritised and you will be credited in the release notes unless you prefer to remain anonymous.

## Scope

This project is a fan site for Guild Wars 2 and does not handle user authentication, payments, or sensitive personal data. The primary security concerns are:

- **Open proxy abuse** — the `/api/texture` route only proxies `render.guildwars2.com` paths; any bypass of this allowlist is in scope
- **SSRF** — any server-side request that can be redirected to an internal or unintended host
- **Injection** — SQL injection into the D1 database or command injection via build scripts

Issues with third-party dependencies (ArenaNet API, Cloudflare platform) should be reported directly to those vendors.
