"use client";

export default function Whitepaper() {
  const whitepaperText = `L4: Layer 4 Tek White Paper
Abstract
In an era dominated by volatile cryptocurrencies, pump-and-dump schemes, and over-hyped communities, L4 emerges as the pinnacle of financial innovation. Built on “Layer 4 Tek” – a revolutionary protocol that transcends traditional blockchain layers – L4 is designed for one purpose: unbreakable stability. No selling allowed. No decentralized exchanges (DEX) to tempt the weak. No community to dilute the vision. This is the future of financial stability, crafted by retards for retards. L4 isn’t just a token; it’s a commitment to holding forever, ensuring your wealth remains eternally secure in a world of chaos.

1. Introduction
The cryptocurrency landscape is plagued by instability. Tokens rise and fall based on whims, influencers, and market manipulations. Communities form, only to fracture under greed. DEXs enable instant selling, eroding value. Enter L4: Layer 4 Tek. L4 operates on a hypothetical “Layer 4” of the blockchain stack – above Layer 1 (base chains like Ethereum), Layer 2 (scaling solutions like Polygon), and Layer 3 (application layers). Layer 4 is the “eternal hold” layer, where transactions are one-way: acquire and never release.

L4 is not for the faint-hearted or the intelligent. It’s by retards, for retards – embracing simplicity, stubbornness, and zero sophistication. Our motto: Hold or Die Trying.

2. Problem Statement
• Selling Destroys Value: In traditional crypto, selling floods the market, crashing prices. Why allow it?
• DEXs Enable Weakness: Decentralized exchanges make it too easy to exit positions, leading to rug pulls and dumps.
• Communities Breed Chaos: Telegram groups, Discord servers, and Twitter spaces turn projects into echo chambers of hype and FUD (fear, uncertainty, doubt).
• Lack of True Stability: Most tokens promise moonshots but deliver craters. Financial stability requires ironclad rules against human error.

The world needs a token that enforces discipline through impossibility. L4 solves this by making selling, trading, and community engagement obsolete.

3. The L4 Solution
L4 introduces “No-Fuck-Selling” (NFS) technology, a proprietary mechanism embedded in Layer 4 Tek. Once acquired, L4 tokens are locked in your wallet via smart contracts that prevent any transfer, sale, or burn functions. You can buy (via a one-time centralized gateway), but that’s it. No DEX integration means no liquidity pools, no swaps, no escapes.
• No Community: L4 has no official channels. No Twitter, no subreddit, no airdrops. Interaction is forbidden to prevent dilution of the retard ethos.
• By Retards, For Retards: The development team consists of anonymous individuals who admit to zero expertise. This ensures decisions are made without overthinking, aligning perfectly with users who seek blind faith over analysis.
• Future of Financial Stability: By eliminating selling, L4 guarantees your holdings appreciate in perceived value over time (assuming no one can ever cash out). Inflation? Zero. Deflation? Eternal.

4. Technology Overview
Layer 4 Tek Architecture
• Base Protocol: Built on a fictional extension of existing blockchains (e.g., Ethereum Layer 4 fork). Transactions use quantum-resistant hashing to ensure “hold-forever” security.
• NFS Mechanism: Smart contracts with self-destructing sell functions. Attempting to sell triggers a wallet freeze, donating tokens to a black hole address.
• No-DEX Enforcement: Protocol-level bans on liquidity provision. Any attempt to list on a DEX results in automatic token revocation.
• Community Nullifier: Built-in algorithms detect and ignore any user-generated content about L4, maintaining purity.

Security audits? Unnecessary – retards don’t hack what they can’t sell.

5. Tokenomics
• Total Supply: 1,000,000,000 L4 tokens (because big numbers look cool).
• Distribution:
• 100% to initial buyers via a single, time-limited sale event.
• 0% to team (we're retards, not greedy).
• 0% to marketing (no community, remember?).

• Utility: Pure holding. Use cases include bragging rights, inheritance planning, and psychological stability.
• Inflation/Deflation: None. Tokens are static post-distribution.
• Burn Mechanism: Accidental burns only, via user error.

Economic Model: Value accrues through scarcity and enforced HODL. Price? Irrelevant – you can't sell anyway.

6. Roadmap
• Phase 1: Launch (Q1 2025): Deploy Layer 4 Tek. Open one-time sale.
• Phase 2: Lockdown (Q2 2025): Activate NFS. Ban all DEX attempts.
• Phase 3: Silence (Ongoing): Erase all traces of community. Let stability reign.
• Phase 4: Eternity: Hold forever. No updates needed.

No forks, no upgrades – perfection is already achieved.

7. Risks and Disclaimers
• You Can't Sell: Seriously, don't buy if you ever want liquidity.
• Retard Risk: This project embraces stupidity; outcomes may vary.
• Regulatory Note: L4 may be classified as a "joke" by authorities, but we're serious about no selling.
• No Guarantees: Financial stability is promised but not insured.

Conclusion
L4: Layer 4 Tek redefines cryptocurrency by stripping away everything that makes it risky. No fucking selling. No DEX. No community. Just pure, retard-proof stability. Join the future – or don't. Either way, once in, you're in forever.`;

  return (
    <div className="flex flex-col flex-1 py-4" style={{ fontFamily: "'LisaStyle', monospace" }}>
      <section className="modern-vintage-card">
        <div className="window-header">
          <div className="window-title">Layer4 Whitepaper</div>
        </div>
        <div className="flex-1 flex flex-col w-full px-4 sm:px-6 overflow-auto whitespace-pre-wrap text-sm leading-relaxed" style={{ maxHeight: '70vh' }}>
          {whitepaperText}
        </div>
      </section>
    </div>
  );
}
