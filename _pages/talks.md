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

<style>
/* Compact, modern, consistent wrapping (slightly smaller type) */
.talks-list{
  display:flex;
  flex-direction:column;
  gap:.8rem;
  margin-top:1rem;
}

.talk-card{
  padding:.8rem .95rem;
  border:1px solid rgba(0,0,0,.12);
  border-radius:14px;
  background: rgba(255,255,255,.95);
  box-shadow: 0 8px 20px rgba(0,0,0,.05);
}

/* Header: title + actions, stays aligned even when title is long */
.talk-card__header{
  display:grid;
  grid-template-columns: 1fr auto;
  gap:.5rem .9rem;
  align-items:start;
}

.talk-card__title{
  margin:0;
  font-size:1.06rem;     /* ↓ was 1.18rem */
  line-height:1.2;
  overflow-wrap:anywhere;
  word-break:normal;
  min-width:0;
}

.talk-card__actions{
  display:flex;
  gap:.4rem;
  flex-wrap:wrap;
  justify-content:flex-end;
  align-items:flex-start;
}

.talk-card__actions .btn{
  white-space:nowrap;
  font-size:.82rem;      /* make buttons match the smaller look */
  padding:.35rem .55rem; /* slightly tighter */
}

/* One-line meta that wraps cleanly */
.talk-card__meta-line{
  margin-top:.4rem;
  display:flex;
  flex-wrap:wrap;
  gap:.3rem .4rem;
}

/* "Chips" for event/date/location */
.talk-chip{
  display:inline-flex;
  align-items:center;
  padding:.15rem .45rem;
  border-radius:999px;
  border:1px solid rgba(0,0,0,.12);
  background: rgba(0,0,0,.02);
  font-size:.84rem;      /* ↓ was .9rem */
  line-height:1.15;
  max-width:100%;
  overflow-wrap:anywhere;
  word-break:normal;
}

.talk-chip--event{
  font-weight:600;
}

/* Description: compact but readable */
.talk-card__desc{
  margin:.5rem 0 0 0;
  font-size:.88rem;      /* ↓ was .95rem */
  line-height:1.32;
}

.talk-card__desc-label{
  display:inline-block;
  font-size:.70rem;
  text-transform:uppercase;
  letter-spacing:.04em;
  opacity:.7;
  margin-right:.35rem;
}

.talk-card__desc-text{
  overflow-wrap:anywhere;
  word-break:normal;
}

/* Mobile: stack actions under title */
@media (max-width: 900px){
  .talk-card__header{
    grid-template-columns: 1fr;
  }
  .talk-card__actions{
    justify-content:flex-start;
  }
}
</style>