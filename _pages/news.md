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

{% if news_items.size > 0 %}
  {% assign groups = news_items | group_by_exp: "i", "i.date | date: '%Y'" %}

  <p style="margin: .5em 0 1em 0; font-size: .95em;">
    Jump to:
    {% for y in groups %}
      <a href="#y{{ y.name }}" style="text-decoration: none; margin-right: .5em;">{{ y.name }}</a>
    {% endfor %}
  </p>

  {% for year in groups %}
    <h3 id="y{{ year.name }}" class="archive__subtitle"
        style="margin-top: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.25em;">
      {{ year.name }}
      <a href="#y{{ year.name }}" aria-label="Link to {{ year.name }}"
         style="text-decoration:none; color:#aaa; font-size:.8em; margin-left:.3em;">#</a>
    </h3>

    <ul class="news-year" style="list-style: none; margin: 0 0 1em 0; padding: 0;">
      {% for item in year.items %}
        <li style="margin-bottom: 0.4em; line-height: 1.35;">
          <span style="display: inline-block; width: 7.5em; color: #555; font-size: 0.9em;">
            {{ item.date | date: "%B %-d" }}
          </span>
          <a href="{{ item.url | relative_url }}" style="text-decoration: none;">
            {{ item.title }}
          </a>
        </li>
      {% endfor %}
    </ul>
  {% endfor %}

  <p style="margin-top: 1em; font-size: .95em;">
    <a href="#top" onclick="window.scrollTo({top:0,behavior:'smooth'}); return false;" style="text-decoration:none;">↑ Back to top</a>
  </p>
{% else %}
  <p>No news items yet.</p>
{% endif %}