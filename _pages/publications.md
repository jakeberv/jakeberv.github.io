---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

<div style="text-align: center;">
  <figure style="width: 100%; margin: 0 auto;">
    <a href="">
      <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/disintegration_of_persistence_of_memory-publications.jpg" width="80%" style="display: block;"/>
    </a>
    <figcaption> The Disintegration of the Persistence of Memory, by Salvador Dalí </figcaption>
  </figure>
</div>

---

*Students I have advised are marked with a ^ symbol*

*Authors receivieng equal co-authors are marked with an \* symbol*

See CV for other publications/pre-prints

{% if author.googlescholar %} You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u> {% endif %}

{% include base_path %}

{% for post in site.publications reversed %} {% include archive-single-pubs.html %} {% endfor %}
