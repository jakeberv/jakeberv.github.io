---
layout: about
permalink: /
title: "Jacob S. Berv"
excerpt: "Evolutionary and Systematic Biologist"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
header:
  og_image: "research/persistence_of_memory-research.jpg"
  overlay_image: "research/persistence_of_memory-about-header.jpg"
  overlay_filter: 0.35
---

<div class="home-modern">

  <section class="home-hero" aria-label="Homepage introduction">
    <p class="home-kicker">{{ site.description }}</p>

    <p class="home-lede">
      <strong>Jacob (Jake) Berv</strong> is an evolutionary biologist interested in building and deciphering the tree of life.
      His research integrates natural history, ecology, genomics, and paleontology—often through the application of novel computational tools—in order to understand the links between micro- and macroevolution.
    </p>

    <p class="home-now">
      Currently supported by an
      <a href="https://midas.umich.edu/news/michigan-institute-for-data-science-announces-new-fellows/" target="_blank" rel="noopener">Eric and Wendy Schmidt AI in Science Postdoctoral Fellowship</a>
      at the University of Michigan.
    </p>
  </section>

  <section class="home-section" aria-label="Start here pathways">
    <h2 class="home-section__title">Start here</h2>

    <div class="home-cards">
      <a class="home-card" href="{{ '/research/phylo-history/' | relative_url }}">
        <h3 class="home-card__title">Phylogeny</h3>
        <p class="home-card__text">
          Tree-of-life inference, deep-time natural history, and phylogenetic “experimental design.”
        </p>
        <span class="home-card__cta">Explore →</span>
      </a>

      <a class="home-card" href="{{ '/research/phylo-methods/' | relative_url }}">
        <h3 class="home-card__title">Diversification</h3>
        <p class="home-card__text">
          Macroecology ↔ macroevolution, including K–Pg ecological filtering and trait-dependent evolution.
        </p>
        <span class="home-card__cta">Explore →</span>
      </a>

      <a class="home-card" href="{{ '/software/' | relative_url }}">
        <h3 class="home-card__title">Software &amp; methods</h3>
        <p class="home-card__text">
          Open-source tools for evolutionary inference across traits and genomes (e.g., <em>bifrost</em>, <em>janus</em>).
        </p>
        <span class="home-card__cta">Explore →</span>
      </a>
    </div>
  </section>

  <section class="home-section" aria-label="Tools highlights">
    <h2 class="home-section__title">Tools</h2>

    <div class="home-tools">
      <div class="home-tool">
        <h3 class="home-tool__title">bifrost</h3>
        <p class="home-tool__text">
          Branch-level inference for multi-regime, multivariate trait evolution on phylogenies.
        </p>
        <p class="home-tool__links">
          <a href="https://github.com/jakeberv/bifrost" target="_blank" rel="noopener">Repo</a>
          <span class="home-dot">·</span>
          <a href="https://jakeberv.com/bifrost" target="_blank" rel="noopener">Docs</a>
          <span class="home-dot">·</span>
          <a href="https://jakeberv.com/bifrost/articles/jaw-shape-vignette.html" target="_blank" rel="noopener">Getting started</a>
        </p>
      </div>

      <div class="home-tool">
        <h3 class="home-tool__title">janus</h3>
        <p class="home-tool__text">
          Detecting shifts in molecular substitution models or base composition across phylogenies.
        </p>
        <p class="home-tool__links">
          <a href="https://git.sr.ht/~hms/janus" target="_blank" rel="noopener">Repo</a>
          <span class="home-dot">·</span>
          <a href="https://git.sr.ht/~hms/janus/tree/master/doc/index.md" target="_blank" rel="noopener">Docs</a>
          <span class="home-dot">·</span>
          <a href="https://www.science.org/doi/10.1126/sciadv.adp0114" target="_blank" rel="noopener">Paper</a>
        </p>
      </div>
    </div>
  </section>

  <section class="home-section" aria-label="Latest updates">
    <h2 class="home-section__title">Latest updates</h2>

    {% assign news_items = site.news
      | where_exp: "i", "i.date"
      | where_exp: "i", "i.date <= site.time"
      | sort: "date"
      | reverse %}

    <ul class="home-news">
      {% for item in news_items limit:5 %}
      <li class="home-news__item">
        <span class="home-news__date">{{ item.date | date: "%b %-d, %Y" }}</span>
        <a class="home-news__title" href="{{ item.url | relative_url }}">{{ item.title }}</a>
        {% if item.excerpt %}
          <p class="home-news__excerpt">{{ item.excerpt | strip_html | strip_newlines | truncate: 160 }}</p>
        {% endif %}
      </li>
      {% endfor %}
    </ul>

    <p class="home-more">
      <a class="home-more__link" href="{{ '/news/' | relative_url }}">View all updates →</a>
    </p>
  </section>

  <small class="home-note">
    The banner shows a portion of Salvador Dalí’s <em>Persistence of Memory</em>. Art historian Dawn Adès described the melting clocks as “an unconscious symbol of the relativity of space and time.” In evolutionary biology, time is also relative — and, outside paleontology, rarely absolute. Dalí’s pruned olive tree, overtaken by time, echoes the challenge of reconstructing the tree of life. In the upper left is a nod to Charles Darwin’s note, “I think,” from his famous <a href="https://www.amnh.org/exhibitions/darwin/the-idea-takes-shape/i-think">sketch of a phylogenetic tree</a>.
  </small>

</div>