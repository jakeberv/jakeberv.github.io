---
layout: archive
permalink: /software/
title: "Software"
---

{::options parse_block_html="true" /}

<div class="software-page">

<div class="software-card">
  <div class="software-card__media">
    <img class="software-logo" src="https://raw.githubusercontent.com/jakeberv/bifrost/main/man/figures/logo.png" alt="bifrost hex sticker" loading="lazy" decoding="async" />
  </div>

  <div class="software-card__body" markdown="1">
### bifrost

**Branch-level Inference Framework for Recognizing Optimal Shifts in Traits**

`bifrost` is an R package for branch-level inference of multi-regime, multivariate trait evolution on phylogenies. It uses penalized-likelihood multivariate GLS to detect where, when, and how evolutionary rate regimes shift across a tree—operating directly in trait space (no PCA required) and scaling to high-dimensional datasets and large phylogenies. A pre-print describing this package is forthcoming (Berv et al.).

<hr class="soft-sep" />

<div class="software-meta">
<small>
<strong>Highlights:</strong> multi-rate Brownian Motion with proportional VCV scaling; greedy, step-wise search with GIC/BIC; parallel candidate scoring; SIMMAP-compatible outputs.
</small>
</div>

<div class="software-actions">
📦 <a href="https://github.com/jakeberv/bifrost">Repository</a> &nbsp;•&nbsp;
📖 <a href="https://jakeberv.com/bifrost">Documentation (pkgdown)</a> &nbsp;•&nbsp;
📄 <a href="https://jakeberv.com/bifrost/articles/jaw-shape-vignette.html">Getting Started vignette</a>
</div>
  </div>
</div>

<div class="software-card">
  <div class="software-card__media software-card__media--linked">
    <a href="https://en.wikipedia.org/wiki/Waltham_Abbey_Church" target="_blank" rel="noopener">
      <img class="software-figure" src="/images/software/janus.webp" alt="janus logo" loading="lazy" decoding="async" />
    </a>
  </div>

  <div class="software-card__body" markdown="1">
### janus

**Detecting molecular model shifts on phylogenies**

`janus` is a program for detecting shifts in molecular substitution models or base composition across phylogenies. It analyzes sequence data with a fixed tree to pinpoint where compositional changes occur and outputs annotated trees for visualization in tools like FigTree. The method was first introduced in **Smith et al. 2023, [*New Phytologist*](https://doi.org/10.1111/nph.19099)**, revealing compositional shifts linked to major evolutionary transitions in plants, and I contributed large-scale simulation workflows used in **Berv et al. 2024 (*Science Advances*)**, where we applied `janus` to study molecular evolution in avian genomes.

<hr class="soft-sep" />

<div class="software-meta">
<small>
<strong>Highlights:</strong> Command-line workflow written in Go; integrates with <code>NLopt</code> for optimization; identifies shifts in substitution models and base composition; supports uncertainty analyses and outputs trees annotated by model.  A complementary implementation written in C is available as part of the <a href="http://git.sr.ht/~hms/hringhorni"><code>hringhorni</code></a> package, optimized for speed and large-scale analyses.
</small>
</div>

<div class="software-actions">
📦 <a href="https://git.sr.ht/~hms/janus">Repository</a> &nbsp;•&nbsp;
📖 <a href="https://git.sr.ht/~hms/janus/tree/master/doc/index.md">Documentation</a> &nbsp;•&nbsp;
📄 <a href="https://www.science.org/doi/10.1126/sciadv.adp0114">Berv&nbsp;et&nbsp;al.&nbsp;2024, <em>Science Advances</em></a> &nbsp;•&nbsp;
📄 <a href="https://doi.org/10.1111/nph.19099">Smith&nbsp;et&nbsp;al.&nbsp;2023, <em>New Phytologist</em></a>
</div>
  </div>
</div>

</div>

{% include software-faq-jsonld.html %}
