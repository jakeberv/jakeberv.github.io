---
permalink: /news/
title: "Archive"
layout: archive
author_profile: true
---

<div class="news-page" data-news-page>

{% capture _news_feed %}{{ '/feed/news.xml' | relative_url }}{% endcapture %}
<link rel="alternate" type="application/atom+xml" title="News — {{ site.title }}" href="{{ _news_feed }}">
<link rel="stylesheet" href="{{ '/assets/css/news-filters.css' | relative_url }}">

{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}
{% assign tag_defs = site.data.news_tags.tags %}
{% assign umbrella_groups = site.data.news_tags.umbrella_groups %}

{% if news_items.size > 0 %}
{% assign year_groups = news_items | group_by_exp: "i", "i.date | date: '%Y'" %}

<div class="news-filters" data-news-filters role="toolbar" aria-label="Filter news by umbrella category">
  <button
    type="button"
    class="news-filter is-active"
    data-news-filter
    data-group="all"
    aria-pressed="true"
  >
    All
    <span class="news-filter-count">{{ news_items.size }}</span>
  </button>

  {% for group in umbrella_groups %}
    {% assign group_count = 0 %}
    {% for i in news_items %}
      {% assign has_group = false %}
      {% if i.tags %}
        {% for tag_slug in i.tags %}
          {% assign tag_def = tag_defs | where: "slug", tag_slug | first %}
          {% if tag_def and tag_def.group == group.slug %}
            {% assign has_group = true %}
          {% endif %}
        {% endfor %}
      {% endif %}
      {% if has_group %}
        {% assign group_count = group_count | plus: 1 %}
      {% endif %}
    {% endfor %}
    <button
      type="button"
      class="news-filter"
      data-news-filter
      data-group="{{ group.slug }}"
      aria-pressed="false"
    >
      {{ group.label }}
      <span class="news-filter-count">{{ group_count }}</span>
    </button>
  {% endfor %}
</div>

<p class="news-jump" data-news-jump>
  Jump to:
  {% for y in year_groups %}
    <a class="news-jump__link" href="#y{{ y.name }}" data-news-year-link data-year="{{ y.name }}">{{ y.name }}</a>
  {% endfor %}
</p>

<p class="news-empty" data-news-empty hidden>No news entries match this category yet.</p>

{% for year in year_groups %}
<section class="news-year-block" data-news-year-block data-year="{{ year.name }}">
  <h3 id="y{{ year.name }}" class="news-year-title">
    {{ year.name }}
  </h3>

  <ul class="news-year">
    {% for item in year.items %}
    {% assign group_tokens = "" %}
    {% if item.tags %}
      {% for tag_slug in item.tags %}
        {% assign tag_def = tag_defs | where: "slug", tag_slug | first %}
        {% if tag_def %}
          {% capture group_token %}|{{ tag_def.group }}|{% endcapture %}
          {% unless group_tokens contains group_token %}
            {% capture group_tokens %}{{ group_tokens }}{{ group_token }}{% endcapture %}
          {% endunless %}
        {% endif %}
      {% endfor %}
    {% endif %}
    {% assign item_groups = group_tokens | replace: "|", " " | strip %}
    <li
      class="news-item"
      data-news-item
      data-groups="{{ item_groups | escape_once }}"
      data-tags="{{ item.tags | join: ' ' | escape_once }}"
    >
      <span class="news-date">{{ item.date | date: "%B %-d" }}</span>
      <a class="news-link" href="{{ item.url | relative_url }}">{{ item.title }}</a>
    </li>
    {% endfor %}
  </ul>
</section>
{% endfor %}

<p class="news-backtotop">
  <a class="news-backtotop__link" href="#top" onclick="window.scrollTo({top:0,behavior:'smooth'}); return false;">↑ Back to top</a>
</p>

{% else %}
<p>No news items yet.</p>
{% endif %}

</div>

<script src="{{ '/assets/js/news-filters.js' | relative_url }}" defer></script>
