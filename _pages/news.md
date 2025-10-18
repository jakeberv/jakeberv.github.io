---
permalink: /news/
title: "Archive"
layout: archive
author_profile: true
---

{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}

{% assign groups = news_items | group_by_exp: "i", "i.date | date: '%Y'" %}

{% for year in groups %}
  <h3 class="archive__subtitle" style="margin-top: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.25em;">
    {{ year.name }}
  </h3>
  <ul class="news-year" style="list-style: none; margin: 0 0 1em 1em; padding: 0;">
    {% for item in year.items %}
      <li style="margin-bottom: 0.45em; line-height: 1.35;">
        <span style="color: #555; font-size: 0.9em;">{{ item.date | date: "%B %-d" }}</span>
        — <a href="{{ item.url | relative_url }}" style="text-decoration: none;">{{ item.title }}</a>
      </li>
    {% endfor %}
  </ul>
{% endfor %}