---
layout: archive
permalink: /software/
title: "Software"
---

{::options parse_block_html="true" /}

<style>
/* Lightweight, page-local styling that works with most Jekyll themes */
.software-card {
  border: 1px solid var(--color-border, #e5e7eb);---
layout: archive
permalink: /software/
title: "Software"
---

{::options parse_block_html="true" /}

---

<div class="software-card" markdown="1">

<img class="software-logo" src="https://raw.githubusercontent.com/jakeberv/bifrost/main/man/figures/logo.png" alt="bifrost hex sticker" />

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
<a href="https://github.com/jakeberv/bifrost">📦 Repository</a>
<a href="https://jakeberv.com/bifrost">📖 Documentation (pkgdown)</a>
<a href="https://jakeberv.com/bifrost/articles/jaw-shape-vignette.html">📄 Getting started</a>
</div>

</div>

<div class="software-card" markdown="1">

### janus

**Detecting molecular model shifts on phylogenies**

<a href="https://en.wikipedia.org/wiki/Waltham_Abbey_Church" target="_blank" rel="noopener">
<img class="software-figure" src="https://raw.githubusercontent.com/jakeberv/jakeberv.github.io/master/images/software/janus.webp" alt="janus logo" loading="lazy" decoding="async" />
</a>

`janus` is a program for detecting shifts in molecular substitution models or base composition across phylogenies. It analyzes sequence data with a fixed tree to pinpoint where compositional changes occur and outputs annotated trees for visualization in tools like FigTree. The method was first introduced in **Smith et al. 2023, [*New Phytologist*](https://doi.org/10.1111/nph.19099)**, revealing compositional shifts linked to major evolutionary transitions in plants, and I contributed large-scale simulation workflows used in **Berv et al. 2024 (*Science Advances*)**, where we applied `janus` to study molecular evolution in avian genomes.

<hr class="soft-sep" />

<div class="software-meta">
<small>
<strong>Highlights:</strong> Command-line workflow written in Go; integrates with <code>NLopt</code> for optimization; identifies shifts in substitution models and base composition; supports uncertainty analyses and outputs trees annotated by model. A complementary implementation written in C is available as part of the <a href="http://git.sr.ht/~hms/hringhorni"><code>hringhorni</code></a> package, optimized for speed and large-scale analyses.
</small>
</div>

<div class="software-actions">
<a href="https://git.sr.ht/~hms/janus">📦 Repository</a>
<a href="https://git.sr.ht/~hms/janus/tree/master/doc/index.md">📖 Documentation</a>
<a href="https://www.science.org/doi/10.1126/sciadv.adp0114">📄 Science Advances 2024</a>
<a href="https://doi.org/10.1111/nph.19099">📄 New Phytologist 2023</a>
</div>

</div>

{% include software-faq-jsonld.html %}
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
.software-meta small {
  font-size: 0.85em;
  line-height: 1.4;
  display: block;
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

/* Slightly smaller figure-style image for Janus card */
.software-figure {
  float: right;
  width: 20%;
  max-width: 260px;
  margin: 0.5rem 0 0.75rem 1.5rem;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
@media (max-width: 640px) {
  .software-figure {
    float: none;
    display: block;
    margin: 1rem auto;
    width: 75%;
    max-width: 340px;
  }
}
</style>

---

<div class="software-card" markdown="1">

<img class="software-logo" src="https://raw.githubusercontent.com/jakeberv/bifrost/main/man/figures/logo.png" alt="bifrost hex sticker" />

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

<div style="clear: both;"></div>
</div>

<div class="software-card" markdown="1">

### janus

**Detecting molecular model shifts on phylogenies**

<a href="https://en.wikipedia.org/wiki/Waltham_Abbey_Church" target="_blank" rel="noopener">
  <img class="software-figure" src="https://raw.githubusercontent.com/jakeberv/jakeberv.github.io/master/images/software/janus.webp" alt="janus logo" loading="lazy" decoding="async" />
</a>

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

<div style="clear: both;"></div>
</div>


{% include software-faq-jsonld.html %}