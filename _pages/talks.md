---
layout: archive
permalink: /talks/
title: "Talks"
header:
  og_image: "teaching/pdp.png"
author_profile: true
---

# Selected recorded talks

<div class="talks-list">
{% for talk in site.data.talks %}
  {% assign watch_url = nil %}
  {% if talk.video_id %}
    {% assign watch_url = talk.video_id %}
  {% elsif talk.youtube_id %}
    {% assign watch_url = "https://www.youtube.com/watch?v=" | append: talk.youtube_id %}
  {% endif %}

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

    {% if talk.description %}
      <p class="talk-card__desc">
        <span class="talk-card__desc-label">Description</span>
        <span class="talk-card__desc-text">{{ talk.description }}</span>
      </p>
    {% endif %}
  </article>
{% endfor %}
</div>