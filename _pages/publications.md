---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

<div style="text-align: center;">
  <figure style="width: 100%; margin: 0 auto;">
    <a href="">
      <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/publication_headers.png" width="80%" style="display: block;"/>
    </a>
    <figcaption> Examples of journal cover images from my research (and birdy mascott) </figcaption>
  </figure>
</div>

---

*Students I have advised are marked with a ^ symbol*

*Authors receivieng equal co-authorship are marked with an \* symbol*

See CV for other publications/pre-prints

{% if author.googlescholar %} You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u> {% endif %}

{% include base_path %}

{% for post in site.publications reversed %} {% include archive-single-pubs.html %} {% endfor %}
