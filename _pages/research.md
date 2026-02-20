---
layout: archive
title: "Research"
permalink: /research/
author_profile: true
header:
  image: #"research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
  og_image: "research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
---

<div class="research-page">

<div class="research-figure research-figure--hero">
  <img src="/images/research/tree-of-life_systems.jpg" alt="The Evogeneao Tree of Life" loading="lazy" decoding="async" />
  <p class="research-caption">A simplified tree of life (evogeneao.com), depicting major events in Earth's history. Major lineages I have studied in published or ongoing research are highlighted in grey.</p>
</div>

<section class="research-focus-card">
<p class="research-kicker">Research Focus</p>
<p class="research-lead">I am fascinated by how microevolutionary genetic processes operating at the level of individual organisms and populations propagate through the tree of life and time to generate macroevolutionary patterns. Taking this lens, my research aims to investigate several overarching themes in systematic biology:</p>

<ul class="research-theme-list">
  <li>What are the roles of evolutionary contingency and convergence in generating patterns of biodiversity?</li>
  <li>When and why might one of these modes of evolution predominate over the other?</li>
  <li>What are the drivers and correlates of evolutionary change?</li>
</ul>
</section>

{% include research-method-explorer.html methods=site.data.research_method_tags %}

<section class="research-core-card">
  <p class="research-kicker research-kicker--questions">Core Questions</p>
  <ul class="research-question-list">
    <li class="research-question-item"><span class="research-question-label">Q1</span><span class="research-question-text">How and why do the tempo and mode of evolution vary across genomes and lineages?</span></li>
    <li class="research-question-item"><span class="research-question-label">Q2</span><span class="research-question-text">How have major events in Earth's history impacted genome evolution and diversification patterns?</span></li>
    <li class="research-question-item"><span class="research-question-label">Q3</span><span class="research-question-text">How can we integrate paleontological and contemporary phylogenetic data to test hypotheses?</span></li>
    <li class="research-question-item"><span class="research-question-label">Q4</span><span class="research-question-text">How can evolutionary "laws" be exploited to learn about evolutionary history?</span></li>
    <li class="research-question-item"><span class="research-question-label">Q5</span><span class="research-question-text">How can evolutionary "laws" inform conservation priorities?</span></li>
  </ul>
</section>

<section class="research-field-strip" aria-label="Field context photos">
  <div class="research-figure research-figure--field">
    <img src="/images/research/fieldwork-manaus-photo.jpg" alt="Field work outside Manaus" loading="lazy" decoding="async" />
    <p class="research-caption">Field work outside Manaus, Brazil.</p>
  </div>
  <div class="research-figure research-figure--field">
    <img src="/images/research/fieldwork-binoculars-photo.jpg" alt="Bird survey fieldwork portrait" loading="lazy" decoding="async" />
    <p class="research-caption">Bird survey fieldwork portrait.</p>
  </div>
</section>

<p class="research-context">Addressing these questions requires an appeal to both population-scale phenomena, as well as larger-scale patterns that can only be directly observed from the fossil record. This interdisciplinary approach to systematic biology recognizes that variation in the "tempo" (speed) and "mode" (processes) of evolutionary change can confound the interpretation of phylogenetic comparative data.</p>

<p class="research-context">Below, you can explore branches of my research program, highlighting selected projects across groups of birds, mammals, reptiles, amphibians, fishes, and deep-sea invertebrates.</p>

<h3 class="research-areas-title">Research Areas</h3>

{% include base_path %}

{% assign ordered_pages = site.research | sort: "order_number" %}

<div class="research-grid">
{% for post in ordered_pages %} {% include archive-single-research-grid.html type="grid" %} {% endfor %}
</div>

</div>

{% include research-faq-jsonld.html %}
