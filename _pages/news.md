---
permalink: /news/
title: "News"
header: 
  #og_image: "teaching/pdp.png"
layout: archive
author_profile: true
---

{% for item in site.news limit:100 %}
  <h4 style="font-size: 1.25em;">{{ item.title }}</h4>
  <p>{{ item.date | date: "%B %d, %Y" }} - {{ item.excerpt }}</p>
  <a href="{{ item.url | prepend: site.baseurl }}">Read more</a>
{% endfor %}