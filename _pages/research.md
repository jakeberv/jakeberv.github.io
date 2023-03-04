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

I am fascinated by how microevolutionary genetic processes operating at the level of individual organisms and populations propagate through the tree of life and time to generate macroevolutionary patterns. Accordingly, my research program integrates across evolutionary scales, from the genome to higher taxa. While much of my experience is with birds, my approach is taxonomically inclusive, and also includes groups of mammals, reptiles, amphibians, fishes, and deep-sea invertebrates. Some of the questions guiding my research include: What are the roles of evolutionary contingency and convergence in generating patterns of biodiversity? When and why might one of these modes of evolution predominate over the other? What are the drivers and correlates of evolutionary change?

A need to decipher whole genomes, range maps for thousands of species, eons of ecological and climate information in the context of millions of preserved museum specimens has created new imperatives for the training of researchers in the life sciences. Integrating these data types to answer questions about biological processes and how they have shaped our world is an emerging ["grand challenge" in biology.](https://www.ncbi.nlm.nih.gov/books/NBK45113/)

Below, you can explore branches of my research program, highlighting selected projects.

<nbsp>

{% include base_path %}

{% assign ordered_pages = site.research \| sort:"order_number" %}

{% for post in ordered_pages %} {% include archive-single.html type="grid" %} {% endfor %}
