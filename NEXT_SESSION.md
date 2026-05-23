# Production is STABLE at commit 0d71424 (known-good, pre-chaos)

## Tomorrow: recover the good work cleanly, one branch at a time

The auth refactor (0cd3209) is BROKEN — never merge refactor/server-side-auth as-is.
Everything tonight got entangled with it. Recover good work by cherry-picking onto clean main.

### 1. FMV improvements (do first — tested, valuable)
git checkout -b fmv-clean 0d71424
git cherry-pick 955c7a5 5a71b1b
npm run dev  # CONFIRM login works AND both units show before merging
# if good: open PR, merge

### 2. Dashboard wizards
Fresh branch off main, cherry-pick c0831c7, test, merge.

### 3. Admin security lockdown
Branch claude/secure-admin-agents — review, test, merge.

### 4. CPO proposals (7 PRs)
Close the 2 duplicate pairs. Review + merge the good ones (#2, #7, #8).

### 5. Build pipeline
build-queue/bootstrap — review, test, merge.

## DO NOT
- Merge refactor/server-side-auth (broken login)
- Merge branches built on top of the auth refactor without cherry-picking clean
- Iterate auth fixes directly on production — use vercel dev / localhost first

## Lessons from tonight
- Check what a branch is built ON before merging (FMV rode on broken auth)
- 403 + Vercel error ID = check Vercel Deployment Protection (it was toggled on)
- "Loading/loop" bug = usually browser cache; test phone/incognito/curl first
- Vercel Authentication should stay DISABLED for the public site

## Still pending (unchanged)
- A2P SMS opt-in (Twilio rejected — CTA verification)
- Google Ads dev token approval (1-2 days)
- SSR for bots (do via middleware, properly, tested locally first)
