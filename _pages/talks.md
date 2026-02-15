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
      <h2 class="talk-card__title">
        {% if watch_url %}
          <a href="{{ watch_url }}" target="_blank" rel="noopener">{{ talk.title }}</a>
        {% else %}
          {{ talk.title }}
        {% endif %}
      </h2>

      <div class="talk-card__actions">
        {% if talk.slides_url %}
          <a class="btn btn--small" href="{{ talk.slides_url }}" target="_blank" rel="noopener">Slides</a>
        {% endif %}
        {% if watch_url %}
          <a class="btn btn--small btn--primary" href="{{ watch_url }}" target="_blank" rel="noopener">Watch</a>
        {% endif %}
      </div>
    </header>

    <dl class="talk-card__meta">
      {% if talk.event %}<div><dt>Event</dt><dd>{{ talk.event }}</dd></div>{% endif %}
      {% if talk.date %}<div><dt>Date</dt><dd>{{ talk.date }}</dd></div>{% endif %}
      {% if talk.location %}<div><dt>Location</dt><dd>{{ talk.location }}</dd></div>{% endif %}
    </dl>

    {% if talk.description %}
      <p class="talk-card__desc">{{ talk.description }}</p>
    {% endif %}
  </article>
{% endfor %}
</div>

<style>
/* Talks page (text-only cards) */
.talks-list{
  display:flex;
  flex-direction:column;
  gap:1rem;
  margin-top:1rem;
}

.talk-card{
  padding:1rem 1.1rem;
  border:1px solid rgba(0,0,0,.12);
  border-radius:14px;
  background: rgba(255,255,255,.95);
  box-shadow: 0 8px 20px rgba(0,0,0,.05);
}

.talk-card__header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:1rem;
  flex-wrap:wrap;
}

.talk-card__title{
  margin:0;
  font-size:1.25rem;
  line-height:1.25;
}

.talk-card__title a{
  text-decoration:none;
}
.talk-card__title a:hover{
  text-decoration:underline;
}

.talk-card__actions{
  display:flex;
  gap:.5rem;
  flex-wrap:wrap;
}

.talk-card__meta{
  margin:.75rem 0 .25rem 0;
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap:.4rem .8rem;
}

.talk-card__meta dt{
  font-size:.75rem;
  text-transform:uppercase;
  letter-spacing:.04em;
  opacity:.7;
}

.talk-card__meta dd{
  margin:0;
  font-size:.95rem;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.talk-card__desc{
  margin:.6rem 0 0 0;
  line-height:1.45;
}

@media (max-width: 900px){
  .talk-card__meta{
    grid-template-columns:1fr;
  }
}
</style>