---
layout: archive
permalink: /talks/
title: "Talks"
header:
  og_image: "teaching/pdp.png"
author_profile: true
---

# Talks

Each talk has a video recording available to view. The following is a list of talks I've given at various conferences and events.

{% for talk in site.data.talks %}
<div class="talks-entry" style="margin-bottom: 2em;">
  <div class="talks-content">
    <h2>{{ talk.title }}</h2>
    <ul style="line-height: 1.2; padding-left: 20px; margin: 0;">
      <li><strong>Event:</strong> {{ talk.event }}</li>
      <li><strong>Date:</strong> {{ talk.date }}</li>
      <li><strong>Location:</strong> {{ talk.location }}</li>
    </ul>
    {% if talk.slides %}
    <p><a href="{{ talk.slides_url }}">View Slides</a></p>
    {% endif %}
    <p style="margin: 0.5em 0; line-height: 1.2; font-size: 0.9em;">
      <strong>Description</strong><br>{{ talk.description }}
    </p>
  </div>
  
  {% if talk.youtube_id %}
  <div class="talks-video">
    <a href="http://www.youtube.com/watch?v={{ talk.youtube_id }}" title="Watch on YouTube">
      <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" style="width: 100%; height: auto; display: block; margin: 0 auto;">
      <div class="play-button-overlay" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;">
        <svg width="64" height="64" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
          <mask id="mask{{ forloop.index }}" x="0" y="0" width="68" height="68" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="68" height="68" fill="#ffffff"/>
            <polygon points="27,20 27,48 49,34" fill="#000000"/>
          </mask>
          <circle cx="34" cy="34" r="32" fill="rgba(255, 255, 255, 0.7)" mask="url(#mask{{ forloop.index }})"/>
          <polygon points="27,20 27,48 49,34" fill="#ffffff" mask="url(#mask{{ forloop.index }})"/>
        </svg>
      </div>
    </a>
  </div>
  {% endif %}
</div>
{% endfor %}

<style>
.talks-entry {
  display: grid;
  grid-template-columns: 3fr 1.5fr;
  column-gap: 5px; /* Adjusted gap for closer proximity */
  align-items: center;
}

.talks-video {
  position: relative;
}

.talks-video a {
  display: block;
  position: relative;
}

@media (max-width: 767px) {
  .talks-entry {
    grid-template-columns: 1fr;
  }

  .talks-video {
    order: 2;
  }

  .talks-video a {
    width: 100%;
    margin-top: 20px;
  }
}
</style>
