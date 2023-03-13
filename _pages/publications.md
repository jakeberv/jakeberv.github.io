---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---
<br>
<figure style="max-width: 100%;">
  <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/publication_headers.png" alt="Examples of journal cover images from my research (and birdy mascott)"/>
  <figcaption> Examples of journal cover images from my research (and birdy mascott)</figcaption>
</figure>

{% if author.googlescholar %} You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u> {% endif %}

{% include base_path %}

{% for post in site.publications reversed %} {% include archive-single-pubs.html %} {% endfor %}

---

*Students I have advised are marked with a ^ symbol*

*Authors receivieng equal co-authorship are marked with an \* symbol*

See CV for other publications/pre-prints  
