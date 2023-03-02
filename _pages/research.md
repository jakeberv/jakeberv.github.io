---
layout: archive
title: "Research Interests"
permalink: /research/
author_profile: true
header:
  image: #"research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
  og_image: "research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
---

![The Persistence of Memory, by Salvador Dalí](https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/persistence_of_memory-research.jpg) [The Persistence of Memory](https://www.thehourglass.com/au/cultural-perspectives/salvador-dali/), by Salvador Dalí

---

I am fascinated by how microevolutionary genetic processes operating at the level of individual organisms and populations propagate through the tree of life and time to generate macroevolutionary patterns. Accordingly, my research program integrates across evolutionary scales, from the genome to higher taxa. While much of my experience has centered on birds, my approach is taxonomically inclusive, and I have also investigated groups of mammals, reptiles, amphibians, fishes, and deep-sea invertebrates. Some of the questions guiding my research include: What are the roles of evolutionary contingency and convergence in generating patterns of biodiversity? When and why might one of these modes of evolution predominate over the other? What are the drivers and correlates of evolutionary change?

***Research themes in Systematic Biology***

My research program as an evolutionary biologist is integrative by design, and examines aspects of the following research themes

**Phylogenetic Natural History** - Molecular evolution - Phylogeny reconstruction - Divergence dating - Phylogenetic comparative methods

**Neotropical biogeography** - Suboscine phylogeny - Population genomics - Areas of Endemism

Below, you can learn more about two branches of my research program:

<nbsp>

{% include base_path %}

{% assign ordered_pages = site.research \| sort:"order_number" %}

{% for post in ordered_pages %} {% include archive-single.html type="grid" %} {% endfor %}
