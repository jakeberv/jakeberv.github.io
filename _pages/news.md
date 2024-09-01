---
permalink: /news/
title: "Archive"
layout: archive
author_profile: true
---

Slowly backfilling important events, new website!

<ol>
{% assign sorted_news = site.news | sort: 'date' | reverse %}
{% for item in sorted_news %}
  <li>
    <span>{{ item.date | date: "%B %d, %Y" }}:</span>
    <a href="{{ item.url | prepend: site.baseurl }}">{{ item.title }}</a>
  </li>
{% endfor %}
</ol>