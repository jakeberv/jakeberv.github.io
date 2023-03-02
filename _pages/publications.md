---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

![The Disintegration of the Persistence of Memory, by [Salvador Dalí](https://archive.thedali.org/mwebcgi/mweb.exe?request=record;id=1652;type=101)](https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/disintegration_of_persistence_of_memory-publications.jpg)
[The Disintegration of the Persistence of Memory](https://archive.thedali.org/mwebcgi/mweb.exe?request=record;id=1652;type=101), by Salvador Dalí

---

**\* Equal authorship**

**^ Student Advisee**

See CV for other publications/pre-prints

{% if author.googlescholar %} You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u> {% endif %}

{% include base_path %}

{% for post in site.publications reversed %} {% include archive-single.html %} {% endfor %}
