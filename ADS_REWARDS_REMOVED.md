# Ads Rewards — Removal Record

> This file documents the removal of the **Rewarded Ads (AdMob SSV)** feature so it can be restored later if needed.

## What Was Removed

### Deleted files
| File | What it did |
|------|-------------|
| `src/Modal/Ads/AdReward.js` | Mongoose model for ad reward documents |
| `src/Controller/Ads/adReward.controller.js` | Reward init/status/claim/abandon + contact & video claim logic |
| `src/Controller/Ads/admobSsv.js` | AdMob Server-Side Verification webhook handler |
| `src/Route/Ads/adRoute.js` | Reward REST routes (`/reward/init`, `/claim`, etc.) |
| `src/Utils/admobVerifier.js` | AdMob signature verification + key cache |

### Removed routes
- `POST /api/v1/ads/reward/init`
- `GET  /api/v1/ads/reward/pending`
- `GET  /api/v1/ads/reward/:requestId/status`
- `POST /api/v1/ads/reward/:requestId/claim`
- `POST /api/v1/ads/reward/:requestId/abandon`
- `GET  /api/v1/ads/ssv/admob` (AdMob SSV callback)
- The entire `/api/v1/ads` router mount in `src/app.js`

### Code edited
| File | Change |
|------|--------|
| `src/app.js` | Removed `adRoutes` + `admobSsv` imports, SSV route, and `/api/v1/ads` mount |
| `src/Controller/Listing/Listing.js` | Removed `AdReward` import; `revealListingContact` now allows only **owner / public / premium** (returns `PREMIUM_REQUIRED` 403 otherwise). Removed unused `dotenv` import |
| `src/Controller/Tranginvideo/Trangin.js` | Removed `AdReward` import; `resolveVideoAccess` no longer checks ad grants — free videos are open to all, paid/trial require admin/premium/purchase. Removed `requiresAd` from all response DTOs |
| `src/Route/ListingRoute/ListingRoute.js` | Updated comment (premium only) |
| `.env.example` | Removed all `ADMOB_*` and `AD_REWARD_*` variables |

## Behaviour After Removal

### Contact reveal (`POST /api/v1/listing/reveal-contact`)
1. Owner → allowed (`source: "owner"`)
2. `contactVisibility !== "masked"` → allowed (`source: "public"`)
3. Premium user → allowed (`source: "premium"`)
4. Otherwise → `403 { code: "PREMIUM_REQUIRED", message: "Upgrade to premium to reveal this contact." }`

### Training video access (`resolveVideoAccess`)
1. `accessType === "free"` → allowed for everyone (`source: "free"`)
2. Admin / superadmin → allowed (`source: "admin"`)
3. Premium user → allowed (`source: "premium"`)
4. Existing purchase → allowed (`source: "purchase"`)
5. Otherwise → locked, `requiresPurchase: true`

## What Was Kept
- **Premium subscriptions** (`src/Utils/premium.js`, `/api/v1/premium`) — unchanged.
- Contact masking (`maskPhone` / `maskEmail`) — unchanged.
- All listing and video APIs — unchanged.
- `axios` dependency — still used by other modules (e.g. OAuth), so **not** removed from `package.json`.

## How to Restore (rollback)
1. Restore the 5 deleted files from git history, e.g.:
   ```bash
   git checkout <commit-before-removal> -- \
     src/Modal/Ads/AdReward.js \
     src/Controller/Ads/adReward.controller.js \
     src/Controller/Ads/admobSsv.js \
     src/Route/Ads/adRoute.js \
     src/Utils/admobVerifier.js
   ```
2. Re-add the `adRoutes` + `admobSsv` imports and the `/api/v1/ads` mount in `src/app.js`.
3. Restore the ad-grant branches in `Listing.js` (`revealListingContact`) and `Trangin.js` (`resolveVideoAccess`).
4. Re-add the `ADMOB_*` / `AD_REWARD_*` variables to `.env` / `.env.example`.

## Notes
- Any existing `adrewards` collection data in MongoDB is left untouched. Drop it manually if desired:
  ```js
  db.adrewards.drop()
  ```
- No frontend is present in this repository; update the separate frontend to stop calling `/api/v1/ads/*` and to handle `PREMIUM_REQUIRED` instead of `AD_REQUIRED`.
