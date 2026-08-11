# v1.9.4 Test Plan / Changes

- Cross-battle isolation: `ren-sunset`, `ren-nagi`, `ren-memories`, `ren-transform` are the only scenes allowed to show the Mephisto-II Ren sequence. Zagi `ren-enter` / `ren-thread` use the legacy figure/ribbon system.
- Zagi encounter owns new effects through `data-owner=nexus_dark_zagi_bond` and `data-enemy=dark-zagi`.
- Zagi HP: 1680. Zagi-only Nexus max HP: 176.
- Exact dialogue checks:
  - 姬矢准：站起来，孤门！你无数次在绝望的边缘重新站起来，所以我才能继续战斗。
  - 千树怜：不要输啊，孤门！多亏了孤门，我才能作为奥特曼战斗到最后！
  - 斋田莉子：我相信着，如果是孤门的话，一定会保护我的。
- Track mapping:
  1. Himeya one-HP return + Zagi Junis Red.
  2. Mephisto Zwei battle + Zagi Junis Blue.
  3. Sera forest + Ren sunset prebattle.
  4. Zagi legacy encouragement segments.
  5. Zagi phase one.
  6. Noa awakening through final battle.
- Track 1 and Track 2 supplied uploads are SHA-256 identical; separate logical keys are retained.
{
  "nexus_himeya_red.mp3": "b4caaa36beaa28b339cd2d8c60e07cf61adb73b78fbc1e2cdbc77a05bd834a68",
  "nexus_ren_blue.mp3": "b4caaa36beaa28b339cd2d8c60e07cf61adb73b78fbc1e2cdbc77a05bd834a68",
  "nexus_memory_prebattle.ogg": "d542697878865a6c8936239a975e0ee20019f1eeba408f544400c947392c2851",
  "nexus_bond_memories.ogg": "7b3e77f861f42e5841e99fcb0c210457f1c6162ebdcb201d8de3ff7181109e83",
  "nexus_zagi_phase1.ogg": "c18cc82e68ed8654a32716ead0f775c984b0af72119c62cbb78e0865e6ebba5b",
  "nexus_noa_final.ogg": "ed33c6e0854cd1fecf1aea0e9f6ee1f200aa7947e72a8159d6776accae484712"
}
