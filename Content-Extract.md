# Content Extract — Cleanify (Water Tank Cleaning App)

> **Source:** the Water Tank Cleaning Service app in this repo (landing page,
> service config, brand/theme, data models).
> **Important:** this is an **operations app** (bookings, jobs, technicians), not a
> design-agency portfolio. Most of your checklist (client case studies, project
> categories, client logos, brand-guideline docs) **does not exist here**. What
> follows is everything the app actually contains, with each item flagged:
>
> - ✅ **Real** — genuine config/brand data you can reuse
> - ⚠️ **Placeholder** — demo copy hard-coded on the landing page (replace with real business info)
> - ❌ **Not in app** — you must supply this

---

## 0. What this app is / what the business does

**Cleanify** — professional **water tank cleaning and disinfection**, booked
online and carried out by certified technicians, with **before & after photo
proof**. The software also manages the operations behind it: customer records,
bookings, job scheduling, a field-technician mobile app, photo approvals, reviews,
dashboards, and reports.

Tagline (from the hero): **"Clean water tanks, guaranteed spotless."**
Sub-line: _"Professional water tank cleaning and disinfection — booked online, done
by certified technicians, with before & after photo proof."_ ⚠️ Placeholder

---

## 1. Case study / project data
❌ **Not in the app.** There is no case-study, portfolio, or "project" concept
(no project category, problem/solution, scope, timeline, team credits, or live
links). The nearest operational analogue is a **job** (customer + tank details +
assigned technicians + before/after photos + status), which is internal, not a
marketing case study. You'd need to author case studies separately.

---

## 2. Company-level content

| Item | Status | Value in the app |
| --- | --- | --- |
| Brand name | ✅ Real | **Cleanify** (metallic chrome wordmark logo provided) |
| Short bio | ⚠️ Placeholder | "Professional water tank cleaning & disinfection you can trust." |
| Tagline | ⚠️ Placeholder | "Clean water tanks, guaranteed spotless." |
| Mission/vision | ❌ Not in app | — |
| Founding year | ❌ Not in app | — (footer shows current year only) |
| Team size | ⚠️ Placeholder | "50+ Technicians" (hero stat) |
| Milestones/stats | ⚠️ Placeholder | 5,000+ tanks cleaned · 1,200+ happy customers · 4.8★ avg rating · 50+ technicians |
| Industries served | ⚠️ Placeholder | Homes, apartments, offices, hospitals / commercial complexes |

### Services — the operational app actually supports these ✅ (real config)
From the app's service configuration (`serviceType`), each with its own form:

1. **Water tank cleaning** — tank type (concrete / synthetic), number of tanks, capacity, risk 1–10
2. **Washroom cleaning** — types: western / indian / common / urinal / other
3. **Interlock cleaning** — surfaces: driveway / parking / walkway / courtyard; area (sq ft)
4. **Solar panel cleaning** — mounting: rooftop / ground / carport; no. of panels
5. **Pressure washing** — surfaces: wall / floor / facade / roof / vehicle; area (sq ft)
6. **Car wash** — vehicle types: hatchback / sedan / suv / van / bike / truck

### Landing "What we do" cards ⚠️ Placeholder marketing copy
- 🏢 **Overhead tanks** — "Rooftop and loft tanks scrubbed, disinfected and sediment-free."
- 🛢️ **Underground sumps** — "Deep cleaning of underground sumps with safe confined-space handling."
- 🏬 **Commercial complexes** — "Apartments, offices and hospitals — scheduled, large-capacity cleaning."
- 🧪 **Disinfection & testing** — "Food-grade sanitization and water quality checks after every clean."

### "Why choose us" points ⚠️ Placeholder
- 👷 **Certified technicians** — trained, background-checked, uniformed crews
- 📸 **Before & after photos** — visual proof of every job, approved by you
- ⏱️ **On-time guarantee** — live scheduling and timely arrivals
- 🌿 **Eco-friendly** — food-grade, residue-free disinfectants

### How it works (3 steps) ⚠️ Placeholder
1. **Book online** — pick a tank type, date and time in seconds
2. **We clean & sanitize** — technician arrives, cleans, uploads photos
3. **Approve & relax** — review before/after photos and enjoy clean water

### Pricing ⚠️ Placeholder (demo prices)
| Plan | Price | Includes |
| --- | --- | --- |
| **Residential** | ₹999 / tank | 1 tank · scrub + disinfection · before/after photos · water-safe chemicals |
| **Commercial** _(most popular)_ | ₹2,499 / visit | up to 3 tanks · priority scheduling · dedicated technician · quality test report |
| **Annual Care** | ₹4,999 / year | 4 cleanings/yr · 1 free emergency visit · 24/7 support · reminder scheduling |

### FAQ ✅ (usable copy, though generic)
- **How often should I clean my water tank?** — Every 6 months to keep water free of sediment, algae, bacteria.
- **How long does a cleaning take?** — Residential 45–90 min; commercial a couple of hours; before/after photos shared.
- **Are your chemicals safe?** — Food-grade, eco-friendly, no harmful residue.
- **Do I need to be home?** — Not necessarily; technician checks in via gate access, you approve photos from your phone.
- **What areas do you serve?** — Across the city and nearby suburbs; confirm at booking.

---

## 3. Social proof

| Item | Status | Detail |
| --- | --- | --- |
| Testimonials (landing) | ⚠️ Placeholder | "Anita R." (5★), "Mohan Apartments" (5★), "Sara K." (4★) — demo quotes |
| Reviews (data model) | ✅ Structure real, content demo | The app stores real reviews per completed job: **star rating, comment, satisfaction, customer, technician, date** — but current DB rows are seed/test data, not real customers |
| Client logos | ❌ Not in app | — |
| Press / awards / partnerships | ❌ Not in app | — |

Sample landing testimonials (replace with real ones):
- _"Booked in minutes and the before/after photos gave me total peace of mind. Water tastes fresh!"_ — Anita R.
- _"They handle all 6 of our building tanks on schedule. Reliable and professional every time."_ — Mohan Apartments
- _"Friendly technician, on time, and the app kept me updated throughout. Highly recommend."_ — Sara K.

---

## 4. Contact & conversion

| Item | Status | Value |
| --- | --- | --- |
| Primary CTA | ✅ Real (in product) | **"Book a cleaning" / "Book now"** → routes to login/booking |
| Phone | ⚠️ Placeholder | 1800-123-456 |
| Email | ⚠️ Placeholder | hello@aquaclean.example |
| Address | ❌ Not in app | — |
| Social links | ❌ Not in app | — |
| Lead-capture form | ❌ Not in app | Bookings are created internally by staff; there is no public lead form storing enquiries |

---

## 5. Brand assets

| Asset | Status | Value |
| --- | --- | --- |
| Primary colour | ✅ Real | **`#0084cd`** (brand-600) |
| Full palette | ✅ Real | 50 `#eff9ff` · 100 `#dff2ff` · 200 `#b8e7ff` · 300 `#78d4ff` · 400 `#2fbeff` · 500 `#06a6f0` · **600 `#0084cd`** · 700 `#0069a6` · 800 `#055989` · 900 `#0a4a71` |
| Accent | ✅ Real | cyan gradient (hero/CTA) toward `#06b6d4` |
| Logo | ✅ Real | 💧 water-droplet mark (white droplet on brand blue). Generated files: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` |
| Typography | ✅ Real (system) | `var(--font-sans)` → falls back to **system-ui / sans-serif**; no custom brand font is bundled |
| Brand guideline doc | ❌ Not in app | — |

---

## What you still need to provide (nothing real for these exists in the app)
- Real company bio, mission/vision, founding year, verified stats
- Any **case studies / portfolio** content (this app has none)
- Real **customer testimonials** (or export approved ones from the reviews module)
- Real **contact details** (phone, email, address, socials) and lead-capture requirements
- **Client logos**, press, awards, partnerships
- A proper **brand-guideline document** and any custom fonts

> Everything marked ⚠️ Placeholder is demo copy hard-coded on the landing page
> (the footer even says "Demo landing page") — swap it for real business
> information before publishing.
