# Sports Image Rights and Identity Rollout

**Status: national country flags live in the new identity components; club and competition logos are intentionally permission-gated.**

TheSportsDB's Terms of Use (updated 17 September 2026) are explicit:
unverified artwork must not be used on publicly distributed websites, apps,
screenshots or marketing materials. Image properties returned by its free API
are metadata, **not proof of rights**, and club/league trademarks remain subject
to independent rights. See https://www.thesportsdb.com/docs_terms_of_use.php

## Approved artwork process

For each club or league:

1. Verify the club/competition identity by provider ID. Do **not** guess from name.
2. Check the specific artwork's original source, creator, licence, version and attribution.
3. For logos/trademarks, document the basis for third-party use, such as written permission
   or an applicable legal exception, reviewed for the intended commercial site use.
4. Add a corresponding entry in `lib/sports-identity.ts` using the exact provider image URL,
   permitted image URL, creator, licence, attribution, permission reference, and review date.
5. Verify rendered image remains unmodified and is displayed only for matching provider IDs.
6. Include any required credits where users can access them.
7. Run the responsive tests and production staging test before enabling it.

Only recognized HTTPS image hosts and expected provider artwork paths pass the resolver.
An unrecognized URL, absent rights entry, wrong team ID, or failed image request
produces the neutral EthioLiveScores fallback badge. The original colors are preserved.
No automated logo scraping or mass copying is allowed.

## Expected data

* TheSportsDB fixture: `idHomeTeam`, `idAwayTeam`, `strHomeTeamBadge`,
  `strAwayTeamBadge`, `strLeagueBadge`.
* Standings: `idTeam` and `strTeamBadge`.
* League: `idLeague` via verified mapping.
* Countries: England (St George cross), Spain, Germany, Italy, France.

## Provider limitations

The free API returns partial fixtures and standings; additional badge fields can
be null. Free TheSportsDB use does not authorize published app-store releases.
Do not interpret `strCreativeCommons` from a team record as a licence for each badge.
