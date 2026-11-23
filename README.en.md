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

## Building

```
node build.js
node verification/check.js
```

`site/` is generated, English pages included.
The pages request nothing from any other server. There are no cookies, no analytics, and nothing that takes input.

## Disclosure and licences

The canon is the operator's text.
The playful parts, the build of the pages and the code, and the English translations were written by Claude (a language model made by Anthropic) at the operator's request. Claude is not an author.

- Text (including the canon): CC BY 4.0 (`LICENSE`)
- Code: MIT (`LICENSE-CODE`)
- Latin-script typeface: Inter Tight, SIL Open Font License 1.1 (`assets/OFL-InterTight.txt`), cut down to Latin characters

It is separate from the operator's research and is not linked to any research page.
