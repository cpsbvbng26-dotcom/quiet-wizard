# Notes on Legality

Last updated: 2026-11-24.

<!-- toc -->

## What this page is

This page sets out where this site might touch Japanese law, and what has been decided to stay clear of it.
It records the operator's own understanding and is not legal advice to readers.
It has not been checked by a lawyer.
The statutes quoted are copied as they are from texts that a watcher in another of the operator's repositories retrieved from the e-Gov Laws API and recorded (see "Statutes" below). No statute text is written from memory.
Statutes are shown in the Japanese original only. The English under each one is a summary, not a translation.
Laws outside Japan have not been looked into.
How the visual parts (typeface, seal, favicon, figures, colours) are handled is set out separately in the [legal handling of the design](design.en.html).

## Facts this rests on

- The site is static pages plus a playground that runs only inside the browser. It collects nothing, sells nothing, and has no advertising or donations.
- The canon is the operator's text, and the playful parts were written by Claude at the operator's request. No one else's work is copied.
- No particular person is named, and no real person is used as an example.
- It contains no sexual depictions.
- The [Field Guide by Visitors](entries.en.html) shows only scenes that readers sent in as GitHub issues and that the operator read and chose. The page itself takes no input. A scene sent in is the text of the person who sent it.

## Article by article

| Law | How it might be touched | What this site has decided |
| --- | --- | --- |
| Penal Code, Articles 230 and 231 | Claiming that a person is a wizard, or spreading word of someone's sexual experience | No particular person is named. The "how to tell one" part of the field guide says that applying it to people nearby is outside the play. The terms of use say such claims about people are not an expected use |
| Penal Code, Article 233 | Damaging someone's credit with false rumours | No person or business is named |
| Civil Code, Article 709 | Infringing someone's rights or interests | As for the two above. No information about people is collected |
| Copyright Act, Articles 21 and 23 | Copying someone else's work and transmitting it | The canon is the operator's text. The playful text and the figures were newly written by Claude and copy no other work. The figures were newly drawn with straight lines, circles and polygons only. The only typeface distributed is the Latin-script typeface Inter Tight under the SIL Open Font License 1.1, with its licence text |
| Act against Unjustifiable Premiums and Misleading Representations, Article 5 | Representations that make goods or services look better than they are in a transaction | Nothing is sold and there are no transactions. Nothing like a wizard certification is issued |
| Consumer Contract Act, Article 10 | Clauses that one-sidedly harm consumers' interests | Readers are given no step for agreeing, and the terms of use are not made into contract clauses. The boxes that a person sending in a scene ticks on the form are a licence for the text, agreement to the three kinds of edit set out there, and checks such as age; the operator does not treat them as an agreement that makes the terms of use contract clauses. The operator's responsibility is as the law provides and is not reduced beyond what the law allows. The article that defines what a consumer contract is (Article 2) is not quoted |
| Civil Code, Article 548-2 | Agreement to standard terms | Readers are given no step for agreeing. There is no mechanism that makes the terms of use the content of an agreement. The boxes ticked by a person sending in a scene are not set up to make the terms of use the content of an agreement either |
| Trademark Act, Article 25 | Using someone else's registered trademark for the same goods or services | The page says that registrations have not been searched, and if a rights holder gets in touch, the name will be changed or no longer used. Not filing a trademark is not a way of avoiding this |

## Taking part (Field Guide by Visitors) and the law

In the [Field Guide by Visitors](entries.en.html), readers send in scenes through a GitHub issue form, and only those the operator reads and chooses appear on the page.
This section sets out, risk by risk, the laws this way of taking part might touch, what has been decided, and what is left over.
It too records the operator's own understanding, and has not been checked by a lawyer.
The statutes quoted are only those in the copy described under "What this page is" above (see "Statutes" below).
Laws and articles not in the copy are named by name and number only.
The texts of laws and articles not in the copy have not been retrieved or checked.

| Risk | Laws touched | What this site has decided | What is left over |
| --- | --- | --- | --- |
| Reputation and privacy of third parties | Penal Code, Articles 230 and 231; Civil Code, Article 709. Not in the copy: Civil Code, Article 723; the interest in privacy that court decisions have recognised | The form's boxes ask that no real or identifiable person be named or described. The operator reads every scene before it appears, and does not add scenes that could point at a person. The intake picks up fixed word patterns, such as "is a wizard" after an honorific or a family word, GitHub usernames, and links. An added scene is removed on request. The operator edits or deletes the issue | Text that points at a person without matching the fixed patterns cannot be caught by the intake. Until the operator reads it, the issue stays as written |
| An issue is public before anyone reviews it | As above | The first part of the form and the description of the scene field say that an issue is public from the moment it is opened. The operator edits or deletes an issue that breaks the rules as soon as it is found, without waiting for a request. How to ask is in [requests and contact](requests.en.html) | The time between an issue being opened and the operator reading it cannot be fixed. GitHub's edit history, and copies made outside GitHub, may be beyond the operator's reach |
| Copyright in the text sent in | Copyright Act, Articles 21 and 23 | The form's boxes ask that the text be the sender's own new writing, copying no one else's text or work, and that it be licensed under CC BY 4.0. Copyright stays with the sender. On a notice from a rights holder, the scene is removed before any decision | The operator cannot fully check whether something was copied |
| Moral rights of the author | Copyright Act, Articles 19 and 20 | The operator edits only in the three ways the sender agreed to with a box: shortening, making the notation consistent, and replacing words that do not fit the rules of this site. A change of meaning is asked about in the issue first, and made only with agreement. An edited scene is marked as edited on the page. No one is asked not to exercise moral rights. No name of the sender is shown on the page. With the licence box, the sender chooses to have no name shown on the page and does not ask for credit (from 2026-12-08; "Planned changes" in the [terms of use](terms.en.html)) | Where the line falls between the three kinds of edit is the operator's reading. The sender can ask for an edited scene to be removed. There is no way to have a scene added with a name |
| A play on a sexual subject, and minors | No article is named. Showing no sexual depictions and the age box are rules of this site | The form's boxes ask that the sender be 18 or older, and that the text say nothing about anyone's sexual experience and contain no sexual content; the intake also picks up fixed words. Scenes with sexual depictions are not added | Age rests on a box alone; there is no way to check it |
| Personal information | Not in the copy: the Act on the Protection of Personal Information (〘個人情報の保護に関する法律〙), and its Article 28 (provision to a third party in a foreign country) | What is handled is the GitHub username of the person who opened the issue and what is written in the issue. The purpose is only to read the scene, decide whether to add it, add it, and answer requests. No name is written on the page or in `data/entries.json`. To check the limit on the number of scenes, the intake counts, from GitHub's public list, the issues sending scenes that the same account opened earlier, and keeps neither the name nor the count anywhere other than the label and the comment. The title and text are given to Claude (Anthropic, United States) only with the consent box, and this is treated as a provision to a third party in a foreign country under Article 28. On request, the added scene is removed. GitHub (United States) holds the issue under its own rules ([privacy policy](privacy.en.html)) | The text of this Act is not in the copy, and how each article applies has not been checked. The issue stays public with the name of the person who opened it, and can be traced from the text of a scene |
| Responsibility of senders and of those who provide the place | Not in the copy: the Information Distribution Platform Act (〘情報流通プラットフォーム対処法〙; earlier commonly called the Provider Liability Limitation Act) | GitHub provides the place where the issue is. A scene added to the site was read, chosen and added by the operator, so it is treated the same as something the operator published. This page does not take the Act to reduce the operator's responsibility. Notices that rights are infringed are received through [requests and contact](requests.en.html); before any decision, the scene is removed from the page, and the issue is edited or deleted | The text of this Act has not been retrieved, and which position under it the operator holds, and which procedures apply, have not been checked |
| Discrimination and hurtful writing | Penal Code, Article 231; Civil Code, Article 709 | Scenes that make fun of people, target someone, or sort people by attributes are not added. The form's boxes ask that no one be called a wizard | Declining rests on the operator's reading |
| Payment and prizes | Act against Unjustifiable Premiums and Misleading Representations, Article 5 | Senders are given no payment and no prize. No fee is taken from senders. Being added is not a prize. Nothing is sold | Nothing |

The laws and articles not in the copy (Civil Code, Article 723; the Act on the Protection of Personal Information and its Article 28; the Information Distribution Platform Act) are named by name and number only. Their texts have not been retrieved or checked.

## Acts outside the terms that may break the law

Using the text of this site to claim that a real person is a wizard, or to make fun of someone by bringing up sexual experience, are acts that may fall under the Penal Code and Civil Code articles above.
The terms of use say that such uses are not expected.
This site does not encourage such acts.

## Statutes

<!-- statute 刑法 第230条｜Whoever publicly states facts and damages a person's reputation is punished, whether or not the facts are true. Damaging the reputation of the dead is punished only when it is done by stating false facts. -->
<!-- statute 刑法 第231条｜Whoever publicly insults a person, even without stating facts, is punished. -->
<!-- statute 刑法 第233条｜Whoever damages a person's credit or obstructs their business by spreading false rumours or by deception is punished. -->
<!-- statute 民法 第709条｜Whoever intentionally or negligently infringes another's rights or legally protected interests must compensate for the resulting damage. -->
<!-- statute 著作権法 第21条｜The author holds the exclusive right to reproduce the work. -->
<!-- statute 著作権法 第23条｜The author holds the exclusive right to transmit the work to the public, including making it available for automatic transmission, and to communicate such a transmitted work to the public by a receiving device. -->
<!-- statute 景品表示法 第5条｜A business must not, in transactions for the goods or services it supplies, use representations that show their quality or terms as markedly better than they really are, or better than those of competitors, in ways that unfairly attract customers and impede consumers' free and rational choice. -->
<!-- statute 消費者契約法 第10条｜A consumer contract clause that limits the consumer's rights or adds to the consumer's duties beyond the non-mandatory rules of law, and that one-sidedly harms the consumer's interests against the basic principle of good faith, is void. -->
<!-- statute 商標法 第25条｜The holder of a trademark right holds the exclusive right to use the registered trademark for the designated goods or services, except to the extent covered by an exclusive licence. -->
<!-- statute 民法 第548条の2｜A party that agrees to a standard transaction is deemed to agree to the individual clauses of the standard terms when it agrees to make them the content of the contract, or when the preparer showed this in advance. Clauses that limit the other party's rights or add to their duties and one-sidedly harm their interests against good faith are deemed not agreed. -->
<!-- excerpt 著作権法 第19条｜paragraph 1, first sentence, and paragraph 2｜（氏名表示権） 第十九条 著作者は、その著作物の原作品に、又はその著作物の公衆への提供若しくは提示に際し、その実名若しくは変名を著作者名として表示し、又は著作者名を表示しないこととする権利を有する。｜２ 著作物を利用する者は、その著作者の別段の意思表示がない限り、その著作物につきすでに著作者が表示しているところに従つて著作者名を表示することができる。｜The author has the right to have their real name or a pseudonym shown as the author's name, or to have no name shown, on the original or when the work is offered or shown to the public. Unless the author says otherwise, a person using the work may show the author's name as the author has already shown it. -->
<!-- excerpt 著作権法 第20条｜paragraph 1｜（同一性保持権） 第二十条 著作者は、その著作物及びその題号の同一性を保持する権利を有し、その意に反してこれらの変更、切除その他の改変を受けないものとする。｜The author has the right to keep the work and its title intact, and not to have them changed, cut or otherwise altered against their will. -->
