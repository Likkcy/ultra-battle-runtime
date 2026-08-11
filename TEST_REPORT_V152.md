# v1.5.2 Test Report

Validated before packaging:

- All five audio files exist in `assets/audio/`.
- ffprobe recognizes all five audio assets.
- JavaScript syntax check passes for every file under `src/`.
- Tiga route maps Golza / Kyrieloid / Gatanothor phases 1-2 to the intended tracks.
- Gatanothor normal BGM fades out when the petrification execution begins.
- Glitter transformation one-shot is wired to the revival cinematic.
- Final battle BGM begins 2.8s late and fades in over 7.2s instead of entering abruptly.
- Runtime volume multipliers: transformation .55, final battle .24, Gatanothor .16, Kyrieloid .14, Golza .22.
- Result emission fades music out and stops one-shot asset sources.
- The older procedural final-phase pulse is no longer started for Glitter Tiga.
