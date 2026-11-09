# Shady & Hana wedding invitation: design

Status: direction approved by Shady on 2026-11-09 from the mockup in `docs/design-reference/envelope-v2/`. Written design awaiting his review.

Tags used below: **[Shady]** means he said it. **[Builder's call]** means Claude chose it and he can overrule it. **[Open]** means only he can answer it.

## Intent

A digital invitation for the wedding of Shady and Hana on 18 December 2026 at Mit Rehan. It has to feel handmade and personal, "on another level", and clearly better than what paid invitation makers in Egypt sell. Guests should feel special: each one who replies receives a private card bearing their name. Shady and Hana need a reliable count of who is coming.

Today is 2026-11-09, so 39 days remain. Invitations must go out with enough notice, so the guest-facing flow ships first.

## Goals

1. One main link everyone receives, mostly through WhatsApp. **[Shady]**
2. A tap-to-open envelope that opens into a living, video-like invitation. **[Shady]**
3. After replying with their email, a guest gets a new link to a private invitation card with their name on it. **[Shady]**
4. A separate dashboard where Shady and Hana see how many people are coming and who they are. **[Shady]**
5. An AI assistant chat that helps guests, on a small model, with a persona that can be edited. **[Shady]**
6. A calendar invitation, using Shady's account shadydeeb4@gmail.com. **[Shady]** Exact meaning is listed under Open questions.
7. A vertical video of the invitation for WhatsApp status and forwarding. **[Builder's call]**, answering Shady's request to add video.

## Non-goals

- Seating plans, gift registry, payments, QR check-in at the door.
- Per-guest invitation links sent before the reply. Shady chose one main link. **[Shady]**
- A native app.

## Anti-goals: failure even if it technically works

- It looks like a template, or the art looks like clip-art.
- It copies the reference video's artwork, evil eye, ankh, blue fan palms, layout or the @rsvp_invitess watermark. That video was made for another couple by a commercial studio. Borrow its structure only.
- A guest has to wait through the animation or cannot find the RSVP.
- The animation stutters on a mid-range Android phone.
- The WhatsApp preview is broken or blank.
- The assistant invents a fact, or reveals anything about another guest.
- The count on the dashboard is wrong.
- The engagement page currently on `main` is removed without Shady's say-so.

## Visual world

The source of truth is Shady's flat-lay image, and `docs/design-reference/envelope-v2/` is the approved interactive mockup.

- **Palette:** burgundy `#581119`, deep wine `#3a0a10`, cream `#f5e7d6`, sage `#7f8a68`, antique gold `#b98f4e`, linen `#c9b19b`.
- **Objects:** Persian-tile envelope liner, damask, sage oval S&H seal, cut pomegranate with loose seeds, burgundy lily.
- **Type:** Allura for the names (or a closer licensed script if one matches the image better), Cormorant Garamond for everything else. Arabic needs its own display and text faces. **[Builder's call]**
- **Art source:** new high-resolution AI-generated layers in this exact style, each object separate with a clean transparent edge so it can move independently. **[Builder's call, from Shady's "do it" after this was recommended]** Requires an image API key. Until then, build with the mockup's crops, which are soft at full-screen size and have rough lily edges.

## The experience

### Opening (approved sequence, target timings)

| Time | What happens |
|---|---|
| 0s | Flat-lay on linen. Envelope carries "Shady & Hana" and the date in foil. The seal breathes. |
| 0.3s | Tap: the seal lifts away and music starts from that tap. |
| 0.5s | Flap folds open, light slides over the tile liner. |
| 1s | Card rises with names on it. |
| 2s | Objects clear, the card expands to fill the screen as an arched panel on damask with a tile base. |
| 3s | Words arrive line by line; the names write themselves. |
| 5s | Date catches the light like gold foil. |
| 6s | RSVP button arrives. Lily and pomegranate keep a slow sway; doves cross once. |

Principles taken from the frame-by-frame study of the reference: movement stays at the edges, the center stays calm, text arrives about a line per second.

Required behaviour:
- Plays once per visitor, then opens straight on the invitation on return.
- Skip works at any moment.
- Slow connections and `prefers-reduced-motion` get a direct, gentle path.
- Music only starts from a tap, always has a mute control, and pauses when the page is hidden.
- Ambient loops stop offscreen.
- Tested on a real mid-range Android and an iPhone, inside WhatsApp's browser and in the normal browser.

### Below the invitation

Event details, venue with map link, schedule, dress code and a countdown, using only facts Shady supplies. No invented content.

### RSVP

Fewest possible steps: name, email, attending yes or no, and how many people including themselves when yes. **[Shady]** for name, email and reply. **[Builder's call]** for party size, since "how many people will come" needs it. Default maximum 4, adjustable in the dashboard.

- One reply per email, and only the person replying is named; companions are counted, not named. **[Builder's call]**
- The first reply opens the private card on screen and also emails the link. **[Builder's call]** Emails are unverified, so a repeat of the same email never overwrites the reply or shows the link on screen. It only re-sends the link to that address.
- Input is validated on the server, with spam protection on the public form.
- A guest can change their answer from their private link until the RSVP deadline. After that, changes go through the couple. **[Builder's call]**
- One event, one reply, unless Shady says otherwise.

### Private card

Reached at its own unguessable link, for example `/i/<token>`, opened immediately after replying. **[Shady]**

- Shows the guest's name in script on the card (Arabic or English name as they typed it), with long names fitted automatically.
- Message differs for those attending and those who cannot come.
- Actions: save the card as an image, add to calendar, change answer.
- Not indexed by search engines. The link shows only that guest's own information.

### Languages

English and Arabic with a language switch, proper right-to-left layout and no letter-spacing on Arabic. **[Builder's call]** based on the guests. Arabic wording drafted formally, then approved by Shady and Hana before sending.

### Calendar for guests

"Add to calendar" gives a Google Calendar link and an `.ics` file, in Africa/Cairo time, with a stable event id. Imported events do not update themselves, so any later change is announced by WhatsApp.

### WhatsApp preview

Static 1200x630 JPEG under 300KB, absolute HTTPS URL, no redirects. Final before the link is first shared, because WhatsApp caches previews stubbornly.

### AI assistant

A small chat on the invitation that answers guests' questions.

- **Model:** Claude Haiku 5.5, `claude-haiku-5-5`, the small model. **[Builder's call]** Called from the server only.
- **Knowledge:** only the facts Shady and Hana enter in the dashboard. When it does not know, it says it will ask them. It never guesses.
- **Persona:** name, tone and instructions editable in the dashboard, effective without redeploying. **[Shady]** Default persona is a warm host who replies in the guest's language.
- **Guardrails:** it has no access to guest data, cannot change an RSVP and sends guests to the form instead. Treat persona and guest messages as untrusted when composing prompts. Rate-limit per visitor, cap message length and set a daily spend cap.
- **Unanswered questions** are listed on the dashboard so the couple can add the fact.

### Dashboard

Separate area, `/dashboard`, for Shady and Hana only. **[Shady]** Sign-in by emailed link, restricted to an allow-list of two addresses. **[Builder's call]**

- Leading figure: total people coming. Then replies attending, replies declining.
- Guest table: name, email, status, party size, reply time, private link. Search, filter, CSV export.
- Updates live without refreshing.
- Edit event facts, assistant persona and maximum party size.
- See the assistant's unanswered questions.

**Known limits of one shared link, already explained to Shady:** anyone holding a forwarded link can reply, and the dashboard cannot list who has not replied. The couple can remove a reply from the dashboard to correct the count. **[Builder's call]**

### Video for sharing

A vertical MP4 of this invitation, same art and timing, rendered with Remotion using its official skill (`remotion-dev/skills`, read before installing). **[Builder's call]**

## Technical shape

Decided: Next.js on Vercel and Supabase. **[Shady]**

- Supabase Postgres holds replies, event facts, assistant settings and unanswered questions. Row-level security on every table, no public read of guest data. Service credentials stay on the server.
- Private link tokens are long and random, stored so a database reader cannot trivially browse by name. **[Builder's call]**
- All keys live in Vercel environment variables, never in the repo, which is **public**. No guest data and no secrets may ever be committed.
- Work happens on branch `wedding-2026`. Do not change `main` or the old engagement page without asking.

## Left to the builder

Animation library choice, exact schema, component structure, Arabic font choice, email provider if email is confirmed, spam protection product, and test approach, within the constraints above.

## Launch rules **[Builder's call]**

- Must be live before the link is sent: envelope and invitation, RSVP, private card, email, dashboard count, WhatsApp preview, English and Arabic.
- Can follow after sending, because the page is live: assistant, sharing video.
- Final art is the first task. Shady approves it. Nothing goes to guests before he does.
- Deploys as a new Vercel project from `wedding-2026`, leaving the old engagement page alone.

## Open questions for Shady

1. The date invitations must go out.
2. Web address. A purchased domain is recommended, because reliable email for private links and dashboard sign-in needs one, and the address cannot change after the first share.
3. Calendar: does "an invitation in their calendar set for us" mean an event in Shady and Hana's own calendars, an invitation sent to each guest, or both? Google Calendar is not connected in this session.
4. Event facts: one event or several, time, exact venue name and map link, dress code, RSVP deadline, children invited or not and whether they count, host wording.
5. Hana's email for the dashboard.
6. Image API key for final art. Gemini or OpenAI.
7. Music: which track, and does Shady hold the right to use it?
