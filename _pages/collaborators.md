---
layout: archive
title: "Collaborators"
permalink: /collaborators/
author_profile: true
header:
  image: #"research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
  og_image: "research/the-persistence-of-memory-painting-by-salvador-dali-uhd-4k-wallpaper.jpg"
---


{% include base_path %}

{% assign ordered_pages = site.collaborators \| sort:"order_number" %}

{% for post in ordered_pages %} {% include archive-single.html type="grid" %} {% endfor %}