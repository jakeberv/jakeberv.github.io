---
permalink: /news/
title: "News Archive"
layout: archive
author_profile: true
---

<ul>
{% for item in site.news %}
  <li>
    <a href="{{ item.url | prepend: site.baseurl }}">{{ item.title }}</a>
    <p>{{ item.date | date: "%B %d, %Y" }}</p>
  </li>
{% endfor %}
</ul>
