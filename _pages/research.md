---
layout: archive
permalink: /research/
author_profile: true
header:
  image: #"research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
  og_image: "research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
---

<figure>
  <img src="/images/research/tree-of-life_systems.jpg" alt="The Evogeneao Tree of Life"/>
  <figcaption> A simplified tree of life (evogeneao.com), depicting major events in Earth's history. Major lineages I have studied in published or ongoing research are highlighted in grey.
  </figcaption>
</figure>

I am fascinated by how microevolutionary genetic processes operating at the level of individual organisms and populations propagate through the tree of life and time to generate macroevolutionary patterns. Taking this lens, my research aims to investigate several overarching themes in systematic biology:

-   What are the roles of evolutionary contingency and convergence in generating patterns of biodiversity? 
-   When and why might one of these modes of evolution predominate over the other? 
-   What are the drivers and correlates of evolutionary change?

---
More specifically, I am to answer the following questions:

1.  How and why do the tempo and mode of evolution vary across genomes and lineages?
2.  How have major events in Earth’s history impacted genome evolution and diversification patterns?
3.  How can we integrate paleontological and contemporary phylogenetic data to test hypotheses?
4.  How can evolutionary “laws” be exploited to learn about evolutionary history?
5.  How can evolutionary “laws” inform conservation priorities?

Addressing these questions requires an appeal to both population scale phenomena, as well as larger scale patterns that can only be directly observed from the fossil record. This interdisciplinary approach to systematic biology recognizes that variation in the “tempo” or speed, and “mode” or processes of evolutionary change can confound the interpretation of phylogenetic comparative data.

Below, you can explore branches of my research program, highlighting selected projects.

<nbsp>

{% include base_path %}

{% assign ordered_pages = site.research \| sort:"order_number" %}

{% for post in ordered_pages %} {% include archive-single.html type="grid" %} {% endfor %}
