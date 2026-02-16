---
layout: archive
permalink: /talks/
title: "Talks"
header:
  og_image: "teaching/pdp.png"
author_profile: true
---

# Selected recorded talks

{%- comment -%}
  Newest -> oldest by date. If you want to preserve YAML order, replace:
  talks_sorted = site.data.talks | sort: "date" | reverse
  with:
  talks_sorted = site.data.talks
{%- endcomment -%}
{% assign talks_sorted = site.data.talks | sort: "date" | reverse %}

<div class="talks-list">
{% for talk in talks_sorted %}
  {% assign watch_url = nil %}
  {% if talk.video_id %}
    {% assign watch_url = talk.video_id %}
  {% elsif talk.youtube_id %}
    {% assign watch_url = "https://www.youtube.com/watch?v=" | append: talk.youtube_id %}
  {% endif %}

  {%- comment -%} Hide placeholder descriptions like "update" (case/whitespace-insensitive) {%- endcomment -%}
  {% assign desc_lc = talk.description | default: "" | downcase | strip %}

  <article class="talk-card">
    <header class="talk-card__header">
      <h2 class="talk-card__title">{{ talk.title }}</h2>

      <div class="talk-card__actions">
        {% if watch_url %}
          <a class="btn btn--small btn--primary" href="{{ watch_url }}" target="_blank" rel="noopener">Watch</a>
        {% endif %}
        {% if talk.slides_url %}
          <a class="btn btn--small" href="{{ talk.slides_url }}" target="_blank" rel="noopener">Slides</a>
        {% endif %}
      </div>
    </header>

    <div class="talk-card__meta-line" aria-label="Talk metadata">
      {% if talk.event %}<span class="talk-chip talk-chip--event">{{ talk.event }}</span>{% endif %}

      {% if talk.date %}
        <span class="talk-chip" title="{{ talk.date }}">
          {{ talk.date | date: "%Y-%m-%d" }}
        </span>
      {% endif %}

      {% if talk.location %}<span class="talk-chip">{{ talk.location }}</span>{% endif %}
    </div>

    {%- comment -%}
      Chip rows: show first N, then "+N more" as a <details> that reveals the remaining chips.
      No JS.
    {%- endcomment -%}
    {% assign max_chips = 6 %}

    {% if talk.key_topics and talk.key_topics.size > 0 %}
      <div class="talk-card__meta-line" aria-label="Talk topics">
        <span class="talk-card__meta-label">Topics</span>

        {% for t in talk.key_topics limit: max_chips %}
          <span class="talk-chip talk-chip--topic">{{ t }}</span>
        {% endfor %}

        {% if talk.key_topics.size > max_chips %}
          <details class="talk-more">
            <summary class="talk-chip talk-chip--more">
              +{{ talk.key_topics.size | minus: max_chips }} more
            </summary>
            <div class="talk-more__content">
              {% for t in talk.key_topics offset: max_chips %}
                <span class="talk-chip talk-chip--topic">{{ t }}</span>
              {% endfor %}
            </div>
          </details>
        {% endif %}
      </div>
    {% endif %}

    {% if talk.software_tools and talk.software_tools.size > 0 %}
      <div class="talk-card__meta-line" aria-label="Talk software tools">
        <span class="talk-card__meta-label">Tools</span>

        {% for s in talk.software_tools limit: max_chips %}
          {%- assign s_trim = s | strip -%}
          {%- if s_trim == s_trim | downcase -%}
            <span class="talk-chip talk-chip--tool">{{ s_trim | capitalize }}</span>
          {%- else -%}
            <span class="talk-chip talk-chip--tool">{{ s_trim }}</span>
          {%- endif -%}
        {% endfor %}

        {% if talk.software_tools.size > max_chips %}
          <details class="talk-more">
            <summary class="talk-chip talk-chip--more">
              +{{ talk.software_tools.size | minus: max_chips }} more
            </summary>
            <div class="talk-more__content">
              {% for s in talk.software_tools offset: max_chips %}
                {%- assign s_trim = s | strip -%}
                {%- if s_trim == s_trim | downcase -%}
                  <span class="talk-chip talk-chip--tool">{{ s_trim | capitalize }}</span>
                {%- else -%}
                  <span class="talk-chip talk-chip--tool">{{ s_trim }}</span>
                {%- endif -%}
              {% endfor %}
            </div>
          </details>
        {% endif %}
      </div>
    {% endif %}

    {% if talk.audience and talk.audience.size > 0 %}
      <div class="talk-card__meta-line" aria-label="Talk audience">
        <span class="talk-card__meta-label">Audience</span>

        {% for a in talk.audience limit: max_chips %}
          <span class="talk-chip talk-chip--audience">{{ a }}</span>
        {% endfor %}

        {% if talk.audience.size > max_chips %}
          <details class="talk-more">
            <summary class="talk-chip talk-chip--more">
              +{{ talk.audience.size | minus: max_chips }} more
            </summary>
            <div class="talk-more__content">
              {% for a in talk.audience offset: max_chips %}
                <span class="talk-chip talk-chip--audience">{{ a }}</span>
              {% endfor %}
            </div>
          </details>
        {% endif %}
      </div>
    {% endif %}

    {% if talk.description and desc_lc != "update" %}
      <details class="talk-desc">
        <summary class="talk-desc__summary">Description</summary>
        <div class="talk-desc__body">{{ talk.description | markdownify }}</div>
      </details>
    {% endif %}
  </article>
{% endfor %}
</div>