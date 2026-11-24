# Stealth Wizard

> This is a play.
> This is an entertainment space, separate from the operator's academic work. It is not science.
> This site is for fun. Its subject is the urban legend that "if you are still a virgin at thirty, you become a wizard."
> The "laws" here are not scientific laws. They are not medical or psychological claims either, and they judge no one's sexual experience.
> Nor do they call any particular person a wizard.

Site: <https://quiet-wizard.vercel.app/index.en.html> (Japanese: <https://quiet-wizard.vercel.app/>)

This is the English version of the README. The Japanese [README.md](README.md) is the original; if the two differ, the Japanese one governs.

The site grew from a single text the operator wrote from intuition, "On the Urban Legend of the Wizard at Thirty".
It casts the wizard from that text as a game class, the "Stealth Wizard", and digs into it as a play.
A class here is a game metaphor, like a job in a role-playing game. It does not sort people into groups, and it is not something to pin on anyone.

## Pages

Every page has a Japanese version (`src/<name>.md`, the original) and an English version (`src/<name>.en.md`, a translation).
Each page links to the same page in the other language.
The English canon page says that it is a translation, and shows the Japanese original beside each line.
In the English Principia, each item keeps its "Original" line in Japanese.
On the English rule pages, statutes are quoted in the Japanese original, and the English under them is labelled "Summary, not a translation".

## Taking part

Taking part means sending a scene to the Field Guide by Visitors, and nothing else.
There is no way for anyone to sign up as a player or list themselves as a wizard.
A list of names would line up real GitHub users as wizards.
That would go against two rules of this site: no particular person is called a wizard, and no one's sexual experience is judged.
On 2026-11-23 the operator asked for participation through GitHub accounts, and Claude decided on this form.

- Scenes are sent in through a GitHub issue form (`.github/ISSUE_TEMPLATE/entry.yml`). It has fields for the law, a title, the scene and the language, the required boxes under "Checks", and an optional consent to a language model. There is no credit box. The form is generated from `intake/entry.js` by `node build.js`.
- An issue is public on GitHub from the moment it is opened, before the operator reads it.
- The workflow "みんなの図鑑の受付" (`.github/workflows/entry.yml`) checks the fields, the boxes and the number of scenes sent for issues labelled entry with `intake/entry.js`, and adds a label and one comment of fixed wording. It does not close, lock or delete issues, and publishes nothing. It passes the title and body of an issue to no expression, environment variable or shell.
- Scenes on the page are shown without the sender's name, and `data/entries.json` has no field for a name. The issue itself is public under GitHub's rules, with the name of the person who opened it.
- Each GitHub account can send 3 scenes at most, over its whole life. The intake counts the issues labelled entry that the same account opened earlier, open or closed.
- Once 5 scenes of one law are on the page, no more scenes for that law are taken. The intake counts them in `data/entries.json`. The whole guide holds 50 scenes at most. The form keeps all ten laws as choices, and names the laws with 5 scenes in the field's description and on the page, because a GitHub form does not accept a field without choices, and the intake reads the law from the text of the choice.
- The operator decided these three on 2026-11-23. Following the terms of use (changes unfavourable to readers are announced before the date they take effect), they were announced on 2026-11-24 and take effect on 2026-12-08. No number of days is set, and Claude chose two weeks, so that anyone in the middle of sending a scene can read the new rules.
- Scenes to be added are added to `data/entries.json` through a pull request, by the operator or by Claude at the operator's request. The page (`site/entries.html` and its English page) is built from that file. Claude does not write the scenes.
- The rules are in "Scenes sent in" of the terms of use, "Scenes sent to the Field Guide by Visitors" and "Giving issues to a language model" of the privacy policy, "Scenes in the Field Guide by Visitors" of requests and contact, and "Taking part (Field Guide by Visitors) and the law" of the notes on legality.
- `node intake/entry.js --self-test` checks, on made-up issue bodies and a made-up API, that what should fail fails and that no issue is closed or locked. It has not been tried on real issues.

## Building

```
node build.js
node verification/check.js
node tools/card.js --check
node verification/check_browser.js
node verification/check_browser.js --break
node intake/entry.js --self-test
node verification/indexnow.js --dry-run
```

`site/` is generated, English pages included.
`verification/check_browser.js` is the browser check. It serves `site/` from a small local server with the same headers as `site/vercel.json`, and opens every page in both languages in Playwright's Chromium.
It checks console errors and CSP violations, horizontal overflow at phone and desktop widths in both the light and the dark scheme, keyboard movement and the focus ring, text when zoomed, the reduced-motion setting, the playground's behaviour and announcements, the language switch, the 404 page served at missing addresses inside directories, and the links and anchors within the pages.
The number of checks is printed when it runs. `--break` damages a copy of `site/` and confirms that each kind of damage fails.
CI runs both on every push and pull request.
`verification/live.js` fetches the live Japanese and English home pages and the share card from outside, without logging in, under a generic crawler name and under X's crawler name (Twitterbot). The workflow "本番" runs it once a day. `--self-test` checks, on made-up answers, that it fails what it should.
`verification/indexnow.js` tells IndexNow (the notice that Bing and some other search engines take) which pages were added to or removed from `site/sitemap.xml`.
The workflow "IndexNow" runs it on each push to main that changes `site/sitemap.xml`. Run by hand with all set to yes, it sends every page of the sitemap.
It waits until the live sitemap is the one in that commit and the key file is served, and only then sends.
The key is `INDEXNOW_KEY` in `build.js`; `node build.js` writes it to `site/<key>.txt`, whose content is the key itself. The key is not a secret.
It sends only the addresses of this site's pages, and nothing about readers. `--dry-run` prints the pages it would send, and sends nothing.
Google does not read IndexNow; it reads the sitemap, which robots.txt names.
The pages request nothing from any other server. There are no cookies and no analytics.
The pages themselves take no input. Taking part happens through a GitHub issue form ("Taking part" above).

## Disclosure and licences

The canon is the operator's text.
The playful parts, the build of the pages and the code, and the English translations were written by Claude (a language model made by Anthropic) at the operator's request. Claude is not an author.

- Text (including the canon): CC BY 4.0 (`LICENSE`)
- Code: MIT (`LICENSE-CODE`)
- Latin-script typeface: Inter Tight, SIL Open Font License 1.1 (`assets/OFL-InterTight.txt`), cut down to Latin characters

It is separate from the operator's research and is not linked to any research page.
