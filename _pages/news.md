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
  <h3 class="archive__subtitle" style="margin-top: 1.5em;">{{ year.name }}</h3>
  <ul class="news-year" style="list-style: none; margin: 0; padding: 0;">
    {% for item in year.items %}
      <li style="margin-bottom: 0.6em;">
        <strong>{{ item.date | date: "%B %-d" }}</strong> — 
        <a href="{{ item.url | relative_url }}" style="font-weight: 600; text-decoration: none;">
          {{ item.title }}
        </a>
      </li>
    {% endfor %}
  </ul>
{% endfor %}