# Judgement calls

Interpretive decisions made while annotating, with the reasoning and the
example that raised them, so the same question gets the same answer next
time. Add an entry whenever a choice could reasonably have gone another way.
General principles distilled from these live in the `xaif-iat` skill.

Format: **call** — rationale. *Origin:* example, node. *Status:* settled /
open / revisit.

## Perspective (δ substance)

- **Perspective is dialectical role, not grammatical person.** An opponent
  referred to in the third person for an audience ("these gentlemen think…",
  like "this guy thinks…" on social media) is still II: they are the other
  party to the dispute and their standpoint is under attack. III is reserved
  for sources outside the disagreement (experts, witnesses, the public).
  *Origin:* `engels-alt.json`, RA 93 (anti-authoritarians). *Status:* settled
  (2026-10-28), though it reads II more broadly than the PTA's "addressee".

## Statement type (F/V/P)

- **F if it is checkable by looking, V if it applies a standard.** Test: could
  two people who agree on every fact still disagree? Then V. A contested
  *term* doesn't make a claim V by itself; *applying* a contested standard
  does. "Christian theology proceeds from the articles of faith" is F (look
  at what its arguments start from); "…does not proceed from self-evident
  principles" applies the standard of self-evidence, so V. *Origin:*
  `aquinas.json`, I 13 / I 96. *Status:* settled (2026-10-28).

## Form

- **Generalising from a case is β Exa, not α or γ.** "The necessity of
  authority is nowhere more evident than on a ship" argues particular →
  universal. β needs a shared predicate, so the locution anchors two
  propositions: the universal ("Authority is necessary", u) and the case
  ("Authority on board a ship… is necessary", p). *Origin:* `engels.json` /
  `engels-alt.json`, RA 16. *Status:* settled.
- **Reasons for the case attach to the case, serially.** The ship sentence
  ("the lives of all depend on obedience…") supports the particular claim
  (α VF Cr), which in turn supports the universal. *Origin:* `engels-alt.json`,
  RA 203. *Status:* settled.

- **A claim about a kind is universal.** "Some [sciences] work from premises
  recognized in the innate light of intelligence" divides science into kinds;
  it is about every science of that kind, so its subject is *sciences of the
  first kind* (u), not *some sciences* (p). The examples that follow are
  particular (p), making each example argument β up Exa. *Origin:*
  `aquinas-llm.json`, I 317 / I 321, RA 340 / RA 342. *Status:* settled
  (Ada).
- **A bare division is argued from an implicit premise.** "Sciences are of
  two kinds" is asserted outright; the kinds and examples that follow expand
  on it rather than argue it one by one. Canonicalize the support as an
  unsaid premise about the same subject: *sciences* / *are of two kinds*
  because *sciences* / *may advance from self-evident principles or take
  their principles on trust from a higher science* (α FF Sig; alt. α VF Cr).
  The implicit premise is an I-node anchored by nothing, backed by the
  presence of the examples. *Origin:* `aquinas-llm.json`, I 1182 / I 1190,
  RA 1191. *Status:* settled (Ada).

## Levers

- **"novel" means the reconstruction is wrong.** If no PTA lever fits, look
  first for a missed premise, a mis-set statement type, or a wrong form;
  use `novel` only in extreme cases. *Origin:* `aquinas-llm.json`, RA 1195.
  *Status:* settled (Ada).

- **SYNONYMOUS needs both pairs synonymous.** "Obedience to authority" vs
  "authority" and "saves lives" vs "is necessary" are related, not synonymous;
  a reason is not a synonym of its conclusion. *Origin:* `engels.json`, RA 16
  (was γ i Sy). *Status:* settled

- **Scope follows the quantifier.** Read the subject as a bound variable:
  u if universally quantified ("for all x, if x is a standard applied to
  means-end activities, x does not apply to games"), p if existentially
  ("there is an x such that…"), s for a single, unique individual.
  Grammatical number doesn't decide it. *Origin:* `suits-absurd-games.json`,
  I 21. *Status:* settled (Ada).

## Segmentation and reconstruction

- **Check the translation's idiom before reconstructing.** "Christian theology
  does not look like science" renders *videtur quod non sit scientia*, "it
  seems that it is not a science": the objection's thesis with an illocutive
  marker, restated by "Consequently it is not a science". Not an argument
  from appearance to fact; the two are linked by restatement (MA), not RA.
  *Origin:* `aquinas.json`, I 3 / I 38. *Status:* settled.
- **"Not all X are Y" becomes a particular subject**: "some people do not
  have faith" (scope p), not "faith is not had by all", which reads as
  "nobody has faith". *Origin:* `aquinas.json`, I 28. *Status:* settled.
- **One locution, two canonical forms for two arguments.** "Not everybody
  grants them" needs subject *some people* to share a subject with "some
  people do not have faith" (α FF Cau), and subject *the articles of faith*
  to share one with "the articles of faith are not self-evident" (α VF Cr).
  Anchor both I-nodes from the one locution (as with a universal and a case
  claim), rather than linking them by MA, which is for the speakers' own
  rephrasing. *Origin:* `aquinas.json`, I 23 / I 124. *Status:* settled.

- **"X thinks that p" is reported belief, segmented as whole span + reported
  locution**, with Asserting between them; not Challenging. *Origin:*
  `engels-alt.json`, L 36 → L 74. *Status:* settled (IAT 1.1.5d).
- **"A commission entrusted" means a mandate given to someone, not cargo.**
  The reply contrasts two things conferred on a person: authority vs a
  commission (Bakuninist revocable mandates). Reconstructed as "On a ship at
  sea, what we confer on our delegates is a commission entrusted, not
  authority", rebutting the case claim. *Origin:* `engels-alt.json`, I 33.
  *Status:* open — the English is ambiguous about what "which we confer on
  our delegates" attaches to.
- **Attributing a belief to discredit is ad hominem.** "These gentlemen think
  that renaming things changes them" → "⟨their reply⟩ is held by people who…"
  (II) → "⟨their reply⟩ [is unacceptable]" (U): δ II H. Not expert opinion.
  *Origin:* `engels-alt.json`, RA 93. *Status:* accepted.
- **Sarcasm can carry the conclusion by illocution substitution.** "This is
  how these profound thinkers mock at the whole world" anchors "⟨their
  reply⟩ [is unacceptable]". *Origin:* `engels-alt.json`, L 46 → I 206.
  *Status:* accepted 
- **Structure markers are not locutions.** "ON THE OTHER HAND" (*sed
  contra*) marks a turn in the disputation; it asserts nothing. The clash it
  signals is a Disagreeing YA on the TA between the conflicting
  conclusions, anchoring the CA. *Origin:* `aquinas.json`, L 180 / YA 181.
  *Status:* accepted.
- **A negative universal keeps a universal subject.** "A science is not
  concerned with individual cases" is subject *every science* (u), predicate
  *is not concerned with individual cases*; not subject *no science* (p),
  which hides the quantifier in the subject and invites conversions like "no
  science is sacred doctrine". *Origin:* `aquinas.json`, I 137 / I 152.
  *Status:* accepted.
- **One thesis, one term.** Sacred doctrine, holy teaching and Christian
  theology name the same subject in the *Summa*; reconstruct all as
  *Christian theology* (tick "same term") so arguments share subjects and
  one I-node carries the thesis. *Origin:* `aquinas.json`, I 142 / I 152 /
  I 210. *Status:* accepted.
- **Keep exclusives.** "This science alone…" and "no science other than holy
  teaching" carry the argument; reconstructions that drop *alone* / *only*
  change what was asserted. *Origin:* `aquinas.json`, I 199 / I 210.
  *Status:* accepted.
- **A reply to a distant locution is a TA with several inputs.** When a
  locution answers one far back (a *sed contra* answering the objection's
  conclusion, a distinction denying an objection's major premise), add that
  locution as a second input to the TA into the reply, and anchor the
  Disagreeing or Arguing YA there. A locution still has one incoming TA.
  *Origin:* `aquinas-llm.json`, TA 227, TA into "others work from…".
  *Status:* accepted.
- **Reported locutions in the TA chain.** `aquinas.json` puts the reported
  words (Thessalonians, Augustine) in the reporter's TA chain;
  `einstein.json` keeps them out (reached only through the reporter's YA).
  *Origin:* `aquinas.json`, L 26 / L 197. *Status:* open — pick one.
- **An illocutive marker on a restated thesis is not a new proposition.**
  "Christian theology should be pronounced to be a science" (the
  *respondeo*) asserts "Christian theology is a science" again, not a policy.
  *Origin:* `aquinas-llm.json`, L 249. *Status:* accepted.
- **An analogy's lever is the claim that makes the two cases alike.** "As
  harmony credits its principles taken from arithmetic, so Christian theology
  takes on faith its principles revealed by God" is β ss A on the shared
  predicate *advances from principles recognized in the light of a higher
  science*. What makes Christian theology analogous to harmony is asserted
  earlier, in "namely God's very own": *God's own science is a science
  higher than Christian theology*. That statement is the analogy's lever
  statement. It also licenses reading "takes on faith its principles
  revealed by God" as the same term as "advances from principles recognized
  in the light of a higher science", so no separate RA or implicit middle
  term is needed. *Origin:* `aquinas-llm.json`, I 1197, RA 350.
  *Status:* settled (Ada).
- **Look for an embedded assertion before reaching for an implicit one.**
  An appositive like "namely God's very own" asserts something of its own
  (God has a science, and it is higher). Missing it led to an implicit
  middle term and an RA with no fitting lever. *Origin:* `aquinas-llm.json`,
  L 315. *Status:* settled (Ada).
- **A narrative frame introducing someone's words is a reporting locution**
  (Asserting → the reported locutions), not a dialogue turn. *Origin:*
  `engels-alt.json`, L 21. *Status:* accepted.

## From the Suits, Searle and Truth drafts (2026-11-04)

- **A reported inference is anchored on the reporter's TA.** "This fact
  about games has led some observers to conclude that…" reports an argument.
  The Arguing YA hangs off the TA from the premise's locution into the
  reporting locution; the conclusion is the reported locution's I-node.
  *Origin:* `suits-absurd-games.json`, RA 30. *Status:* accepted
- **A rejection can be both an undercut and a δ.** Suits's "The mistake
  consists in applying the same standard…" locates the error in the
  observers' inference (its lever statement): a CA into that RA. His closing
  conditional is a reductio: judged like going to the office, game playing
  comes out "simply stupid". That is δ II Cse, a second-order "⟨the view⟩
  implies that game playing is simply stupid" (II) into "⟨the view⟩ [is
  unacceptable]", which has a CA into the view. *Origin:*
  `suits-absurd-games.json`, L 7 / L 8. *Status:* settled (Ada).
- **"Or" can rephrase or disjoin.** Use MA only when the context treats the
  alternatives as one view: in Suits, "something inherently absurd about
  games, or… a fundamental paradox" is gathered by "this kind of view", in
  the singular. A real disjunction or dichotomy ("analytic or synthetic" in
  Carnap or Quine) is one I-node carrying the disjunction, or alternatives
  argued separately; never MA. *Origin:* `suits-absurd-games.json`.
  *Status:* settled (Ada).
- **An allegory's details support its identification.** Searle's "I have
  inputs and outputs that are indistinguishable…" and "I can have any formal
  program you like" are not concessions: they say why Searle in the example
  is the computer. Each supports the EQUAL lever statement "Searle in the
  example is Schank's computer in the Chinese case" (α VF Cr, by strong AI's
  own standard of equivalence). *Origin:* `searle-chinese-room.json`, L 5 /
  L 6. *Status:* settled (Ada).
- **The rebuttal set up by "but" isn't marked.** "…any formal program you
  like, but I still understand nothing" quietly rebuts strong AI's test
  without announcing it. Marking it would need an implicit RA (behaviour →
  understanding) for I 7 to undercut. Left out, as structure markers are.
  The relation of an argument to a prior one ("for the same reasons") is
  carried only by which locutions feed the TA. *Origin:*
  `searle-chinese-room.json`. *Status:* open: the TA inputs may not be
  enough context.
- **An argument by cases concludes each case, then the whole.** Searle's
  "Schank's computer understands nothing of any stories… since in the
  Chinese case the computer is me, and in cases where the computer is not
  me…" anchors three I-nodes in one locution: the general claim and one per
  case. Each case is argued from "Searle understands nothing" by its own
  lever statement (β ss Eq, β ss Ma), and each case supports the general
  claim as a part of it (β ss Cpo). No note needed to say the cases are
  exhaustive. *Origin:* `searle-chinese-room.json`. *Status:* settled (Ada).
- **A speech built on one counterexample: the speaker is the example.**
  Truth answers the man's universal ("women need special treatment") with
  her own case: she is strong, which EXCLUDES needing special treatment (α
  FF Inc), and she has never been given it (α FF Sig). "Need" is read as a
  fact about capability (F), not entitlement. Her case then denies the
  universal, with "Sojourner Truth is a woman" as the EXAMPLE lever
  statement. *Origin:* `truth-woman.json`. *Status:* settled (Ada).
- **A counterexample denies a universal; it doesn't assert the opposite
  one.** Truth isn't arguing "all women are strong" but "it is not the case
  that women are weak". One case can't license a universal, but it does
  contradict one. The conclusion is "Not all women need special treatment",
  canonicalized by the "not all X are Y" rule as subject *some women* (p):
  β ps Exa, with a CA into the man's claim. *Origin:* `truth-woman.json`,
  I 31. *Status:* settled (Ada).
- **Re-subjecting without a voice change is tagged by what else changed.**
  Suits YA 14 (anaphora, explication), Searle YA 28 (anaphora) and
  Aristotle YA 13 (anaphora, passivization) each recast a sentence around
  another subject. A uniform "explication" convention was considered and
  rejected; the tags stay as they are. *Origin:* review of the Suits,
  Searle and Truth drafts. *Status:* settled (Ada).
- **Explicate only what the inference needs.** A second draft added an
  equality line ("women are as capable as men") and more implicit nodes;
  Ada judged it over-reconstructed. Add an implicit I-node only where an
  RA can't be typed without it. *Origin:* `truth-woman.json`, draft 2.
  *Status:* settled (Ada).
- **A repeated refrain anchors one I-node.** All four "ain't I a woman?"
  locutions anchor "Sojourner Truth is a woman" by Rhetorical Questioning.
  No MA: the wording doesn't change. *Origin:* `truth-woman.json`.
  *Status:* accepted.
- **A directive presenting evidence is multimodal argument.** "Look at me!
  Look at my arm!" presents visual evidence the text doesn't contain; the
  map assumes what the audience saw and anchors, by illocution
  substitution, the case claim "Sojourner Truth is strong" (cf. Wagemans on
  multimodal argumentation). The stanzas after it are signs of that
  strength, including the last: hardship borne and survived, not
  motherhood as proof of womanhood. *Origin:* `truth-woman.json`.
  *Status:* settled (Ada).
- **Background knowledge stays out of the map.** Arguments are meant to
  carry their reasons with them, independent of the speaker's biography, so
  the map reconstructs what the passage gives. Reading Truth as also arguing
  that Black people, and so Black women, ought to have better lives needs
  history the passage doesn't state; it is not reconstructed. Context may
  go in a `note`. *Origin:* `truth-woman.json`. *Status:* proposed (Ada:
  ideal, though how far it holds is open).
