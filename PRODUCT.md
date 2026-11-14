# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, both primary (owner's answer, 2026-11-14):

1. **The faithful and readers** who already know the Docteur B. Silas Gbavou: they come to read a book, receive a book, study the teaching or write to the ministry.
2. **People discovering the ministry**, mostly arriving from Facebook, TikTok, WhatsApp or a recommendation, mostly on a phone, often on a modest connection (Bénin and francophone Africa).

The owner is also a user: he publishes books, videos, writings and audios and answers messages from the private office (`/gestion`).

## Product Purpose

The central place of the Ministère d'Enseignement of the Docteur B. Silas Gbavou: his books, teachings (writings, audios, YouTube sermons), a sourced study engine, and a private consultation with the ministry. Success: a visitor understands who the Docteur is and what the ministry offers, then receives a book, studies the teaching, or contacts the ministry.

Three actions carry equal weight (owner's answer): **receive a book**, **study the teaching**, **contact the ministry**.

## Positioning

The teaching of one named author, organised under three exact pillars, with books readable page by page and a study engine that answers only from his published works and always cites the exact page. Nothing is generated in his name.

## Operating Context

- Visitors read in French, on phones first; installable as a PWA.
- Books are PDFs from the owner's authorised Google Drive folder, imported as immutable editions.
- The ministry contacts the visitor back by WhatsApp most of the time.

## Capabilities and Constraints

- Next.js App Router, TypeScript, SQLite, server-side worker (see docs/ARCHITECTURE.md). Hosting chosen: Render (render.yaml), not yet deployed.
- Exact labels that never change: **Enseignements Prophétiques**, **Enseignements Spirituels**, **Enseignements Doctrinaux**; **Moteur d'Étude & Concordance Doctrinale du Dr B. Silas**; the footer sentence; the watermark sentence (lib/domain/contacts.ts).
- Pillars carry the numbers 01., 02., 03. (owner's requirement).
- The site stays private (noindex) until the owner decides to open it.

## Brand Commitments

- Owner's palette: bleu nuit #0B2545, or #D4AF37 (lines and details only), albâtre #FAF9F6, crème d'étude #FAF8F5, text #1E293B, celestial blue and amber from the silk veils.
- Owner's type: Cormorant Garamond (titles, true italics), Plus Jakarta Sans (text).
- The doctoral arch is the ministry's own motif.
- Owner's own formulations for his ministry: Docteur de la Parole, de la Saine Doctrine, homme prophétique, formateur au prophétique, dispensateur des Mystères de DIEU et des Réalités Spirituelles du Sacerdoce en CHRIST.
- Real contacts, shown by name, never as raw URLs: Facebook and TikTok "Docteur B. Silas Gbavou", WhatsApp +229 01 67 96 00 94, Silasgbavou@gmail.com.

## Evidence on Hand

- 10 PDFs in the authorised Drive folder (8 classified, 2 to classify). Real covers live on each PDF's first page.
- **Official photographs: the owner will send them** (answer of 2026-11-14). Until they arrive, any photograph on the site is a licensed stand-in of objects or places only, never a person, and is listed as a stand-in.
- Absent and never to be fabricated: biography facts beyond the formulations above, testimonials, figures, quotes of the day, verses, partner logos, portraits.

## Product Principles

1. Fidelity first: nothing is said in the Docteur's name that he did not write.
2. Every promise works: each button leads to a real action (receive, study, contact).
3. Phone first, modest connections: light pages, readable on a small screen.
4. Dignity without spectacle: a teaching ministry, not a marketing campaign.

## Accessibility & Inclusion

WCAG 2.2 AA target; French-language readers on phones; reduced motion respected.
