---
permalink: /news/
title: "Archive"
layout: archive
author_profile: true
---

<div class="news-page">

{% capture _news_feed %}{{ '/feed/news.xml' | relative_url }}{% endcapture %}
<link rel="alternate" type="application/atom+xml" title="News — {{ site.title }}" href="{{ _news_feed }}">

{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}

{% if news_items.size > 0 %}
{% assign groups = news_items | group_by_exp: "i", "i.date | date: '%Y'" %}

<p class="news-jump">
  Jump to:
  {% for y in groups %}
    <a class="news-jump__link" href="#y{{ y.name }}">{{ y.name }}</a>
  {% endfor %}
</p>

{% for year in groups %}
<h3 id="y{{ year.name }}" class="news-year-title">
  {{ year.name }}
</h3>

<ul class="news-year">
  {% for item in year.items %}
  <li class="news-item">
    <span class="news-date">{{ item.date | date: "%B %-d" }}</span>
    <a class="news-link" href="{{ item.url | relative_url }}">{{ item.title }}</a>
  </li>
  {% endfor %}
</ul>
{% endfor %}

<p class="news-backtotop">
  <a class="news-backtotop__link" href="#top" onclick="window.scrollTo({top:0,behavior:'smooth'}); return false;">↑ Back to top</a>
</p>

{% else %}
<p>No news items yet.</p>
{% endif %}

</div>