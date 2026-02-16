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
  Render newest-to-oldest by date (recommended once dates are ISO YYYY-MM-DD).
  If you prefer the YAML order, replace talks_sorted with site.data.talks.
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

  {%- comment -%} Normalize "update" placeholders without changing your YAML {%- endcomment -%}
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
      {% if talk.date %}<span class="talk-chip">{{ talk.date }}</span>{% endif %}
      {% if talk.location %}<span class="talk-chip">{{ talk.location }}</span>{% endif %}
    </div>

    {% if talk.key_topics and talk.key_topics.size > 0 %}
      <div class="talk-card__meta-line" aria-label="Talk topics">
        <span class="talk-card__desc-label">Topics</span>
        {% for t in talk.key_topics %}
          <span class="talk-chip">{{ t }}</span>
        {% endfor %}
      </div>
    {% endif %}

    {% if talk.software_tools and talk.software_tools.size > 0 %}
      <div class="talk-card__meta-line" aria-label="Talk software tools">
        <span class="talk-card__desc-label">Tools</span>
        {% for s in talk.software_tools %}
          <span class="talk-chip">{{ s }}</span>
        {% endfor %}
      </div>
    {% endif %}

    {% if talk.audience and talk.audience.size > 0 %}
      <div class="talk-card__meta-line" aria-label="Talk audience">
        <span class="talk-card__desc-label">Audience</span>
        {% for a in talk.audience %}
          <span class="talk-chip">{{ a }}</span>
        {% endfor %}
      </div>
    {% endif %}

    {% if talk.description and desc_lc != "update" %}
      <p class="talk-card__desc">
        <span class="talk-card__desc-label">Description</span>
        <span class="talk-card__desc-text">{{ talk.description | markdownify }}</span>
      </p>
    {% endif %}
  </article>
{% endfor %}
</div>