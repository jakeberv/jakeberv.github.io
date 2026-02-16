---
layout: archive
permalink: /software/
title: "Software"
---

{::options parse_block_html="true" /}

<style>
/* SOFTWARE (page-local) — reuse Talks card + chip styling */

/* Card styling copied from Talks */
.software-card{
  display: flow-root; /* contain floated images like the logo */
  padding: .8rem .95rem;
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 14px;
  background: rgba(255,255,255,.95);
  box-shadow: 0 8px 20px rgba(0,0,0,.05);
  margin: 1.1rem 0 1.6rem;
}

/* Headings slightly compact */
.software-card h2, .software-card h3{
  margin: .15rem 0 .25rem 0;
  font-size: 1.15rem;
  line-height: 1.2;
}

.software-meta{
  font-size: .95rem;
  color: rgba(0,0,0,.68);
  margin-bottom: .6rem;
}
.software-meta small{
  font-size: .92em;
  line-height: 1.4;
  display: block;
}

hr.soft-sep{
  border: 0;
  border-top: 1px solid rgba(0,0,0,.12);
  margin: .85rem 0 .7rem;
}

/* “Pills” copied from Talks chip styling */
.software-actions{
  margin-top: .45rem;
  display: flex;
  flex-wrap: wrap;
  gap: .3rem .4rem;
}

.software-actions a{
  display: inline-flex;
  align-items: center;
  padding: .15rem .45rem;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.12);
  background: rgba(0,0,0,.02);
  font-size: .84rem;
  line-height: 1.15;
  text-decoration: none;
  white-space: nowrap;
}

.software-actions a:hover{
  border-color: rgba(0,0,0,.22);
  background: rgba(0,0,0,.05);
}

/* Images (keep your current layout behavior) */
.software-logo{
  float: right;
  margin-left: 1rem;
  margin-bottom: .25rem;
  height: 110px;
  max-width: 35%;
}

.software-figure{
  float: right;
  width: 22%;
  max-width: 260px;
  margin: .45rem 0 .6rem 1.2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,.10);
}

@media (max-width: 640px){
  .software-logo{
    float: none;
    display: block;
    margin: 0 auto .75rem;
    height: 95px;
  }
  .software-figure{
    float: none;
    display: block;
    margin: .9rem auto;
    width: 78%;
    max-width: 340px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark){
  .software-card{
    border-color: rgba(255,255,255,.14);
    background: rgba(255,255,255,.04);
    box-shadow: 0 10px 24px rgba(0,0,0,.30);
  }
  .software-meta{ color: rgba(255,255,255,.72); }
  .software-actions a{
    border-color: rgba(255,255,255,.16);
    background: rgba(255,255,255,.06);
  }
  hr.soft-sep{ border-top-color: rgba(255,255,255,.14); }
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
<a href="https://github.com/jakeberv/bifrost">📦 Repository</a>
<a href="https://jakeberv.com/bifrost">📖 Documentation (pkgdown)</a>
<a href="https://jakeberv.com/bifrost/articles/jaw-shape-vignette.html">📄 Getting Started vignette</a>
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