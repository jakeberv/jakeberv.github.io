---
layout: archive
title: "Research Interests"
permalink: /research/
author_profile: true
header:
  image: #"research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
  og_image: "research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
---

<figure>
  <img src="/images/research/persistence_of_memory-research.jpg" alt="The Persistence of Memory"/>
  <figcaption> Salvador Dalí's famous painting, The Persistence of Memory </figcaption>
</figure>

I am fascinated by how microevolutionary genetic processes operating at the level of individual organisms and populations propagate through the tree of life and time to generate macroevolutionary patterns. Taking this lens, my research aims to address broad questions in systematic biology:

--What are the roles of evolutionary contingency and convergence in generating patterns of biodiversity? 
--When and why might one of these modes of evolution predominate over the other? 
--What are the drivers and correlates of evolutionary change?

Addressing these questions requires an appeal to both population scale phenomena, as well as larger scale patterns that can only be directly observed from the fossil record. This interdisciplinary approach to systematic biology recognizes that variation in the “tempo” or speed, and “mode” or processes of evolutionary change can confound the interpretation of phylogenetic comparative data. Identifying regions of the tree of life where transitions in the evolutionary processes of molecular or phenotypic evolution have occurred will provide transformative research opportunities.

Below, you can explore branches of my research program, highlighting selected projects.

<nbsp>

{% include base_path %}

{% assign ordered_pages = site.research \| sort:"order_number" %}

{% for post in ordered_pages %} {% include archive-single.html type="grid" %} {% endfor %}
