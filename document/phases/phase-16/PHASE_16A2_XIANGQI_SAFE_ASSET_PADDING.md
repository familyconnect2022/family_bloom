# Phase 16A.2 — Xiangqi Precise Safe Crop

## Goal
Freeze the approved Family Bloom Xiangqi piece artwork as production assets without clipping the wooden bevel, outer ring, or shadow at phone display sizes.

## Changes
- Re-cropped all 14 approved Xiangqi pieces from the approved master artwork.
- Exported each piece to a 384×384 lossless WebP transparent canvas.
- Preserved generous transparent safe area around every piece.
- Added `assets/xiangqi/asset-manifest.json` with SHA-256, dimensions, and measured alpha margins.
- `XiangqiPiece` remains `contain` and explicitly allows visible overflow.
- Added Phase 16A.2 build gate to Debug and Release scripts.

## Approved minimum safe margins
The production manifest enforces at least 48 px on every side. Current batch minimums are substantially larger.

## Scope
This phase is visual only. It does not add Xiangqi rules, realtime transport, clocks, invitations, or server-authoritative gameplay. Those follow after Android visual approval.
