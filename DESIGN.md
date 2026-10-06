---
version: alpha
name: ssMarket
description: ssMarket is an internal marketplace for SmartOSC employees. The interface is calm and information-dense, on a white canvas with navy text and hairline borders. Colour carries meaning. SmartOSC blue ({colors.primary}) marks what you can act on. SmartOSC green ({colors.accent}) marks what is good or available (in stock, paid, delivered). Orange ({colors.deadline}) marks a pre-order and its closing time. Bricolage Grotesque carries headings, prices and the wordmark; Inter carries all other UI text; Geist Mono carries codes such as order references. Buttons are pills and cards have 12px corners.

colors:
  primary: "#2B62B2"
  on-primary: "#ffffff"
  primary-deep: "#234F91"
  primary-soft: "#EAF0F9"
  accent: "#4CAF4D"
  accent-deep: "#27702B"
  accent-soft: "#E8F5E9"
  warn: "#C37D0D"
  warn-deep: "#8A5A0A"
  warn-soft: "#FFF6E5"
  error: "#D45656"
  error-deep: "#B93C3C"
  error-soft: "#FDECEC"
  deadline: "#FF9447"
  deadline-deep: "#A8400A"
  deadline-soft: "#FFF1E4"
  canvas: "#ffffff"
  surface: "#f3f6fa"
  surface-soft: "#fafafa"
  hairline: "#dde3ec"
  hairline-soft: "#ededed"
  ink: "#16233b"
  charcoal: "#1c1c1e"
  slate: "#3a3a3c"
  steel: "#566176"
  stone: "#888888"

typography:
  heading-1:
    fontFamily: Bricolage Grotesque
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: -0.5px
  heading-2:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.25
  heading-3:
    fontFamily: Bricolage Grotesque
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.30
  heading-4:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.40
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
  body-md-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.50
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
  body-sm-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.50
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.40
  caption-bold:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.40
  micro-uppercase:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.40
    letterSpacing: 0.5px
  button-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.30
  price:
    fontFamily: Bricolage Grotesque
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.20
    fontStretch: 75%
  code-sm:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.40

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section-sm: 48px
  section: 64px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.stone}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
    border: "1px solid {colors.hairline}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  card-base:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.hairline}"
    height: 40px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.primary}"
  text-input-invalid:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.error}"
  app-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    height: 64px
    border: "0 0 1px {colors.hairline} solid"
  listing-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "0"
    border: "1px solid {colors.hairline}"
  image-placeholder:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.stone}"
    rounded: "{rounded.md}"
  mode-badge-in-stock:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-deep}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  mode-badge-preorder:
    backgroundColor: "{colors.deadline-soft}"
    textColor: "{colors.deadline-deep}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  status-badge-positive:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-deep}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  status-badge-info:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  status-badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn-deep}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  status-badge-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error-deep}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  filter-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.steel}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
    border: "1px solid {colors.hairline}"
  filter-chip-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.full}"
    border: "1px solid {colors.primary-soft}"
  item-table-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "{spacing.sm} 0"
    border: "0 0 1px {colors.hairline-soft} solid"
  mode-choice-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  mode-choice-card-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    border: "2px solid {colors.primary}"
  alert-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error-deep}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.error}"
  alert-success:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-deep}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
---

## Overview

ssMarket replaces two habits inside the company: scrolling a group chat to find
out whether anyone is selling a speaker, and filling in a shared spreadsheet to
pre-order fruit for the week. The interface therefore has two jobs. It must
make listings quick to scan, and it must make the state of an order obvious at
a glance.

The visual language is quiet. Almost everything is white, navy and light
grey. Three colours carry meaning, and each has one job:

- **Blue means "you can act here".** Primary buttons, links, focus rings and
  selected states. Selected category chips are soft blue with deep-blue text;
  the selected selling-mode segment is navy with white text; the current
  navigation item is soft blue in the header and blue with a heavier weight in
  the tab bar.
- **Green means "this is good".** In stock, paid, delivered, saved.
- **Orange means "this closes at a set time".** Pre-order badges, the
  closing time on a card, the "Sắp chốt đơn" row. A pre-order that closes
  today uses the solid orange; later ones use the soft orange.

**Key characteristics**

- White canvas, hairline borders, almost no shadows
- One blue primary action per view
- Green only where it carries a positive meaning, never as decoration
- Pill buttons and badges, 12px cards, 8px inputs
- Bricolage Grotesque for headings, prices and the wordmark; Inter for everything else people read; Geist Mono for codes they copy
- Usable from a 360px-wide phone

## Colors

The names below are the design names. In CSS the tokens live in
`src/app/globals.css`. The green family is exposed there as `positive`,
`positive-deep` and `positive-soft`, because shadcn/ui already uses the name
`accent` for neutral hover surfaces.

### Brand

- **Primary** ({colors.primary}): the blue of "smart" in the SmartOSC logo.
  Primary buttons, links, focus rings, selected states.
- **Primary Deep** ({colors.primary-deep}): hover and pressed state of primary
  buttons.
- **Primary Soft** ({colors.primary-soft}): background of selected chips,
  informational badges and banners.
- **Accent** ({colors.accent}): the green of "osc" in the logo. Status dots,
  icons, and backgrounds that carry dark text.
- **Accent Deep** ({colors.accent-deep}): green text on light backgrounds.
- **Accent Soft** ({colors.accent-soft}): background of positive badges and
  success messages.

### Feedback

- **Warn** ({colors.warn}), **Warn Deep** ({colors.warn-deep}), **Warn Soft**
  ({colors.warn-soft}): something is waiting on a person, such as an unpaid
  order.
- **Error** ({colors.error}), **Error Deep** ({colors.error-deep}), **Error
  Soft** ({colors.error-soft}): validation errors, failures, cancelled orders.

In each family the base colour is for icons, borders and dots; the deep variant
is for text; the soft variant is for backgrounds.

### Deadline

- **Deadline** ({colors.deadline}): background of a pre-order that closes
  today, with ink text.
- **Deadline Deep** ({colors.deadline-deep}): orange text on light
  backgrounds.
- **Deadline Soft** ({colors.deadline-soft}): background of pre-order
  badges, closing times and the "Sắp chốt đơn" row.

### Neutral

- **Canvas** ({colors.canvas}): page and card background.
- **Surface** ({colors.surface}) and **Surface Soft** ({colors.surface-soft}):
  subtle section backgrounds and image placeholders.
- **Hairline** ({colors.hairline}) and **Hairline Soft**
  ({colors.hairline-soft}): borders and dividers.
- **Ink** ({colors.ink}): headings and body text.
- **Steel** ({colors.steel}): secondary text and metadata.
- **Stone** ({colors.stone}): placeholder text and disabled labels. Not for
  text people must read.

### Contrast

Body text must reach 4.5:1 (WCAG AA). These are the pairings in use:

| Text | Background | Ratio |
|---|---|---|
| white | primary | 6.01 |
| white | primary-deep | 8.08 |
| primary | canvas | 6.01 |
| primary | primary-soft | 5.25 |
| ink | accent | 5.64 |
| accent-deep | canvas | 6.11 |
| accent-deep | accent-soft | 5.43 |
| warn-deep | warn-soft | 5.52 |
| error-deep | canvas | 5.56 |
| error-deep | error-soft | 4.87 |
| steel | canvas | 6.24 |
| deadline-deep | deadline-soft | 5.57 |
| deadline-deep | canvas | 6.17 |
| ink | deadline | 7.16 |
| primary-deep | primary-soft | 7.05 |
| steel | surface | 5.75 |
| white | ink | 15.70 |

These pairings fail and must not be used for text: white on accent (2.78),
error on canvas (3.99), warn on canvas (3.35).

`src/lib/theme/contrast.test.ts` recomputes the ratios from `globals.css` and
fails the build when a pairing drops below 4.5:1. Add a pairing there when you
introduce one.

## Typography

**Bricolage Grotesque** is used for headings (h1, h2), prices and the wordmark. Prices use its condensed width (75%). **Inter** is used for every other piece of interface text. **Geist Mono** is used only for values people copy or compare character by character: order codes, bank account numbers, transfer references.

| Token | Size | Weight | Use |
|---|---|---|---|
| `{typography.heading-1}` | 36px | 700 | Page titles on wide screens |
| `{typography.heading-2}` | 28px | 700 | Page titles on phones, listing title |
| `{typography.heading-3}` | 22px | 700 | Section titles |
| `{typography.heading-4}` | 18px | 600 | Card titles, form section titles |
| `{typography.body-md}` | 16px | 400 | Descriptions, form inputs |
| `{typography.body-sm}` | 14px | 400 | Tables, metadata, navigation |
| `{typography.caption}` | 13px | 400 | Helper text under fields |
| `{typography.caption-bold}` | 13px | 600 | Badges |
| `{typography.micro-uppercase}` | 11px | 600 | Table column headers |
| `{typography.button-md}` | 14px | 500 | Button labels |
| `{typography.price}` | 22px | 700 | Prices on cards and in tables; Bricolage Grotesque, condensed (75% width) |
| `{typography.code-sm}` | 13px | 500 | Order codes, account numbers |

Emphasis comes from weight, never from italics. Body text keeps a 1.5 line
height. Prices are written as `35.000 đ` and never abbreviated to "35k".

## Layout

- **Base unit** 4px; most gaps are multiples of 8px.
- **Page container** 1280px maximum width, 16px side padding on phones and
  32px from 640px up.
- **Listing grid** below 560px one listing per row, photo on the left; two columns up to 767px, three up to 1023px, four above.
- **Navigation** from 768px the header carries the links; below it a fixed tab bar at the bottom does. The header is 64px tall and sticky; the filter bar sticks directly under it.
- **Forms** a single column with a 640px maximum width; related fields may sit
  side by side from 640px up.
- **Vertical rhythm** {spacing.xxl} between page sections, {spacing.md}
  between form fields, {spacing.xs} between a label and its field.

## Elevation

The interface is flat. Cards are separated from the page by a 1px hairline, not
by a shadow. Only floating surfaces (menus, dialogs, toasts) carry a shadow:
`rgba(0, 0, 0, 0.08) 0px 4px 12px`.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.sm}` | 6px | Table cells with a background, small tags |
| `{rounded.md}` | 8px | Inputs, thumbnails, alerts |
| `{rounded.lg}` | 12px | Cards, dialogs, image galleries |
| `{rounded.full}` | 9999px | Buttons, badges, chips, avatars |

Buttons are always pills. A square button reads as a third-party widget.

## Components

**`button-primary`**: the one main action of a view, such as "Đăng bán" or
"Lưu hồ sơ". Blue with white text; pressed and hover use
`{colors.primary-deep}`. Use at most one per view.

**`button-secondary`**: an outlined pill for secondary actions such as "Lưu
nháp" or "Đăng xuất".

**`button-ghost`**: a borderless pill for low-emphasis actions inside rows and
toolbars.

**`text-input`**: 40px high with an 8px radius and a hairline border. Focus
switches to a 2px `{colors.primary}` border. An invalid field uses an
`{colors.error}` border with the message below it in `{colors.error-deep}`.

**`app-header`**: a sticky white bar, 64px high, with a hairline below. The
logo mark on the left (the wordmark joins it from 1024px), the navigation
links from 768px, the search field, a round "+" link named "Đăng bán" from
768px, and the account menu on the right.

**`mobile-tab-bar`**: the phone navigation, fixed to the bottom with five
items and a raised round "Đăng bán" in the middle. The current tab is blue
with a heavier weight and a thicker icon stroke. Hidden from 768px, where the
header carries the links.

**`listing-card`**: a hairline card. Below 560px it is a row with the photo on
the left; from 560px the photo is on top (4:3, cropped to fill). It shows the
title on at most two lines, the price line ("từ 35.000 đ/kg") and the seller
name in `{colors.steel}`. The mode is shown in a foot strip: "Có sẵn" with a
green dot on white, or "Chốt <time>" on soft orange (solid orange when it
closes today), with "N người đã đặt" when there are orders. The whole card is
one link.

**`closing-soon-carousel`**: the "Sắp chốt đơn" band on the home page. A soft
orange band with up to 10 pre-orders sorted by closing time, in a row that
scrolls sideways. Arrow buttons appear from 560px; phones swipe.

**`mode-segment`**: the "Hình thức bán" control above the grid. A segmented
control with the choices "Tất cả", "Có sẵn" and "Đặt trước"; the selected one
is navy with white text.

**`image-placeholder`**: shown when a listing has no image. A
`{colors.surface}` block with a centred icon in `{colors.stone}`.

**`mode-badge-in-stock`** and **`mode-badge-preorder`**: tell the two kinds of
listing apart. "Có sẵn" is green because the goods exist now; "Đặt trước" is
blue because it invites an action before a deadline.

**`status-badge-*`**: order and listing states. Positive: paid, delivered,
open. Info: payment reported and awaiting confirmation. Warn: unpaid, awaiting
delivery, draft. Error: cancelled, refund needed.

**`filter-chip`** and **`filter-chip-active`**: category and mode filters above
the grid. The active chip uses `{colors.primary-soft}` with a
`{colors.primary}` border and text, and exposes `aria-pressed="true"`.

**`item-table-row`**: one item of a listing with its name, unit price with
unit, and remaining stock. Rows are separated by soft hairlines. Column headers
use `{typography.micro-uppercase}` in `{colors.steel}`.

**`mode-choice-card`**: the first step of "Đăng bán". Two large cards side by
side (stacked on phones), each with a title and a one-line explanation. The
selected card gets a 2px `{colors.primary}` border and a
`{colors.primary-soft}` background.

**`alert-error`** and **`alert-success`**: inline messages. Soft background
with deep text, and `role="alert"` for errors.

## Wordmark

The product name is set in Inter Bold with tight tracking: "ss" in
`{colors.primary}` and "Market" in `{colors.accent-deep}`. It echoes the
two-tone SmartOSC logo. The SmartOSC logo file itself is not part of this
repository and must not be added to it.

Use the `Wordmark` component; do not retype the name with ad-hoc colours.

## Do's and Don'ts

### Do

- Use blue for the thing the person should do next.
- Use green only for a positive state: available, paid, delivered, saved.
- Use the deep variant whenever a colour is used for text.
- Keep one primary button per view; make the rest secondary or ghost.
- Show money with thousands separators and the `đ` suffix.
- Show a dedicated empty, loading and error state for every list.

### Don't

- Don't put white text on green.
- Don't use the base warn or error colour for text.
- Don't use green as decoration or for the primary button.
- Don't add shadows to cards or a third typeface.
- Don't write hex colours in components; use the theme classes.
- Don't rely on colour alone for state: badges always carry a text label.

## Responsive behaviour

| Width | Changes |
|---|---|
| below 560px | One listing per row, photo on the left. The tab bar replaces the header navigation. Tables scroll horizontally with the first column fixed. |
| 560 to 767px | Two-column grid of stacked cards; carousel arrows appear. |
| 768 to 1023px | Three-column grid. Navigation links and the "+" sell link move into the header; the tab bar is hidden. Forms may place related fields side by side. |
| 1024px and up | Four-column grid. The wordmark appears next to the logo mark. |

- Search stays in the header row at every width.
- The minimum supported width is 360px, with no horizontal page scroll.
- Touch targets are at least 44px high on phones: buttons, chips, menu items
  and table row actions grow through padding.
- Images keep their aspect ratio and never stretch.

## Iteration guide

1. Change a token here first, then in `src/app/globals.css`; the contrast test
   tells you if a pairing broke.
2. Add new component variants as separate entries under `components:`.
3. Before adding a colour, check whether an existing family already expresses
   the meaning.
4. Run `npx @google/design.md lint DESIGN.md` after editing this file.
