---
layout: about
permalink: /
title: "Jacob S. Berv"
excerpt: "Evolutionary and Systematic Biologist"
#title: "Jacob S. Berv, PhD"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
header:
  og_image: "research/persistence_of_memory-research.jpg"
  #image: "research/persistence_of_memory-about-header.jpg"
  overlay_image: "research/persistence_of_memory-about-header.jpg"
  overlay_filter: 0.35 # same as adding an opacity of 0.5 to a black background
  #caption: "**Salvador Dalí**"
  #actions:
  #  - label: "Download"
  #    url: "https://github.com"
---

<div class="home-intro">
  <div class="home-intro__text">
    <p class="about-intro"><strong>Jacob (Jake) Berv</strong> is an evolutionary biologist interested in building and deciphering the tree of life. His research integrates data from natural history, ecology, genomics, and paleontology—often through the application of novel computational tools—in order to understand the links between micro- and macroevolution.</p>
    <p class="about-intro about-intro--follow">He is the lead developer of <code>bifrost</code> and a contributor to <code>janus</code>; explore featured tools on the <a href="{{ '/software/' | relative_url }}">Software page</a>.</p>
    <div class="home-intro__badges" aria-label="Software badges">
      <a class="home-intro__badge home-intro__badge--bifrost" href="{{ '/software/' | relative_url }}" title="bifrost software card on the Software page">
        <img src="https://raw.githubusercontent.com/jakeberv/bifrost/main/man/figures/logo.png" alt="bifrost logo" loading="lazy" decoding="async" />
      </a>
      <a class="home-intro__badge home-intro__badge--janus" href="{{ '/software/' | relative_url }}" title="janus software card on the Software page">
        <img src="/images/software/janus.webp" alt="janus logo" loading="lazy" decoding="async" />
      </a>
    </div>
  </div>
  <figure class="home-intro__media">
    <a class="home-intro__media-link" href="{{ '/background/' | relative_url }}" title="View Background page">
      <img src="/images/research/home-intro-binoculars.jpg" alt="Jacob Berv during bird survey fieldwork" loading="lazy" decoding="async" />
    </a>
  </figure>
</div>

<link rel="stylesheet" href="{{ '/assets/css/news-filters.css' | relative_url }}">

{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}
{% assign tag_defs = site.data.news_tags.tags %}
{% assign umbrella_groups = site.data.news_tags.umbrella_groups %}
{% assign pinned_items = news_items | where: "pinned", true %}

{% if pinned_items.size > 0 %}
<h2>Pinned News</h2>
<div class="home-news home-news--pinned tex2jax_ignore mathjax_ignore">
  {% for item in pinned_items limit: 3 %}
  <article class="home-news-item">
    <time
      class="home-news-item__date"
      datetime="{{ item.date | date_to_xmlschema }}"
      aria-label="{{ item.date | date: '%B %-d, %Y' }}"
    >
      {{ item.date | date: "%b %-d '%y" | upcase }}
    </time>
    <div class="home-news-item__body">
      <p class="home-news-item__title">
        <a href="{{ item.url | relative_url }}" class="home-news-item__link">
          {{ item.title }}
        </a>
      </p>
    {% assign summary_parts = item.content | split: "<!--news-excerpt-->" %}
    {% assign summary_html = summary_parts | last | strip %}
    {% assign summary_teaser = summary_html | split: "<hr" | first | split: "<style" | first | split: "<script" | first | strip %}
    {% assign summary_text = summary_teaser | strip_html | strip_newlines | replace: "  ", " " | strip %}
    {% assign fallback_text = item.excerpt | strip_html | strip_newlines | replace: "  ", " " | strip %}
    {% assign excerpt_html = item.excerpt %}
    {% assign excerpt_text = fallback_text %}
    {% if summary_parts.size > 1 and summary_text != "" %}
      {% assign excerpt_html = summary_teaser %}
      {% assign excerpt_text = summary_text %}
    {% endif %}
    {% assign pinned_summary = excerpt_text | replace: "  ", " " | strip %}
    {% assign sentence_parts = pinned_summary | split: ". " %}
    {% if sentence_parts.size > 1 %}
      {% assign pinned_summary = sentence_parts | first | strip | append: "." %}
    {% endif %}
    <div class="home-news-item__excerpt">
      <div class="home-news-item__summary">
        {{ pinned_summary | escape }}
      </div>
    </div>
    </div>
  </article>
  {% endfor %}
</div>
{% endif %}

<h2 class="home-news-heading home-news-heading--recent">Recent News</h2>

{% if news_items.size > 0 %}
<div
  class="home-news home-news--recent tex2jax_ignore mathjax_ignore"
  data-news-page
  data-news-limit="5"
  data-news-scroll-on-click="false"
>
  <div class="news-filters home-news-filters" data-news-filters role="toolbar" aria-label="Filter recent news by umbrella category">
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
      {% if group_count > 0 %}
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
      {% endif %}
    {% endfor %}
  </div>

  <p class="news-empty home-news-empty" data-news-empty hidden>No news entries match this category yet.</p>

  {% assign year_groups = news_items | group_by_exp: "i", "i.date | date: '%Y'" %}
  {% for year in year_groups %}
  <section class="home-news-year-block" data-news-year-block data-year="{{ year.name }}">
    <h3 class="home-news-year-title">{{ year.name }}</h3>

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
      <article
        class="home-news-item"
        data-news-item
        data-groups="{{ item_groups | escape_once }}"
        data-tags="{{ item.tags | join: ' ' | escape_once }}"
      >
        <time
          class="home-news-item__date"
          datetime="{{ item.date | date_to_xmlschema }}"
          aria-label="{{ item.date | date: '%B %-d, %Y' }}"
        >
          {{ item.date | date: "%b %-d" | upcase }}
        </time>
        <div class="home-news-item__body">
          <p class="home-news-item__title">
            <a href="{{ item.url | relative_url }}" class="home-news-item__link">
              {{ item.title }}
            </a>
          </p>
        </div>
      </article>
    {% endfor %}
  </section>
  {% endfor %}
</div>
{% else %}
<p>No news items yet.</p>
{% endif %}

<p class="home-news-all-link">
  <a href="{{ '/news/' | relative_url }}" data-news-all-link data-base-href="{{ '/news/' | relative_url }}">
    View all news →
  </a>
</p>

<script src="{{ '/assets/js/news-filters.js' | relative_url }}" defer></script>

<br>

<small style="line-height: 1 !important; display: block; margin: 0;">
The banner shows a portion of Salvador Dalí’s <em>Persistence of Memory</em>. Art historian Dawn Adès described the melting clocks as “an unconscious symbol of the relativity of space and time.” In evolutionary biology, time is also relative — and, outside paleontology, rarely absolute. Dalí’s pruned olive tree, overtaken by time, echoes the challenge of reconstructing the tree of life. In the upper left is a nod to Charles Darwin’s note, “I think,” from his famous <a href="https://www.amnh.org/exhibitions/darwin/the-idea-takes-shape/i-think">sketch of a phylogenetic tree</a>.
</small>
