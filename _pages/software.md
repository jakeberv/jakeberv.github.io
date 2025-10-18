---
layout: archive
permalink: /software/
title: "Software"
---

{::options parse_block_html="true" /}

<style>
/* Lightweight, page-local styling that works with most Jekyll themes */
.software-card {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  padding: 1.25rem;
  margin: 1.25rem 0 2rem;
  background: var(--color-bg, #fff);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.software-card h2, .software-card h3 {
  margin-top: 0.2rem;
  margin-bottom: 0.25rem;
  font-size: 1.35rem;
}
.software-meta {
  font-size: 0.95rem;
  color: var(--color-muted, #555);
  margin-bottom: 0.75rem;
}
.software-actions a {
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.software-actions a:hover {
  border-bottom-color: currentColor;
}
.software-logo {
  float: right;
  margin-left: 1rem;
  margin-bottom: 0.25rem;
  height: 120px;
  max-width: 35%;
}
@media (max-width: 640px) {
  .software-logo { float: none; display: block; margin: 0 auto 0.75rem; height: 100px; }
}
hr.soft-sep {
  border: 0;
  border-top: 1px solid var(--color-border, #e5e7eb);
  margin: 1rem 0 0.75rem;
}
/* Normalize inline-code spacing if theme adjusts it */
.software-card code { letter-spacing: normal; }
</style>

Below is a selection of software projects that I lead or contribute to. These tools focus on phylogenetic comparative methods, high-dimensional trait evolution, and macroevolutionary inference.

---

<div class="software-card" markdown="1">

<img class="software-logo" src="https://raw.githubusercontent.com/jakeberv/bifrost/main/man/figures/logo.png" alt="bifrost hex sticker" />

### bifrost

**Branch-level Inference Framework for Recognizing Optimal Shifts in Traits**

`bifrost` is an R package for branch-level inference of multi-regime, multivariate trait evolution on phylogenies. It uses penalized-likelihood multivariate GLS to detect where, when, and how evolutionary rate regimes shift across a tree—operating directly in trait space (no PCA required) and scaling to high-dimensional datasets and large phylogenies.

<hr class="soft-sep" />

<div class="software-meta">
<strong>Highlights:</strong> multi-rate Brownian Motion with proportional VCV scaling; greedy, step-wise search with GIC/BIC; parallel candidate scoring; SIMMAP-compatible outputs.
</div>

<div class="software-actions">
📦 <a href="https://github.com/jakeberv/bifrost">Repository</a> &nbsp;•&nbsp;
📖 <a href="https://jakeberv.com/bifrost">Documentation (pkgdown)</a> &nbsp;•&nbsp;
📄 <a href="https://jakeberv.com/bifrost/articles/jaw-shape-vignette.html">Getting Started vignette</a>
</div>

<div style="clear: both;"></div>
</div>

More tools will appear here as they are released.