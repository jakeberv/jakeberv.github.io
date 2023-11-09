---
layout: archive
permalink: /talks/
title: "Talks"
header:
  og_image: "teaching/pdp.png"
author_profile: true
---

# Talks

Each talk has a video recording available to view.

{% for talk in site.data.talks %}
<div class="talks-entry">
  <div class="talks-content">
    <h2>
      {% if talk.video_id %}
      <a href="{{ talk.video_id }}" target="_blank">{{ talk.title }}</a>
      {% else %}
      {{ talk.title }}
      {% endif %}
    </h2>
    <ul style="line-height: 1.2; padding-left: 20px; margin: 0;">
      <li><strong>Event:</strong> {{ talk.event }}</li>
      <li><strong>Date:</strong> {{ talk.date }}</li>
      <li><strong>Location:</strong> {{ talk.location }}</li>
    </ul>
    {% if talk.slides_url %}
    <p><a href="{{ talk.slides_url }}">View Slides</a></p>
    {% endif %}
    <p style="margin: 0.5em 0; line-height: 1.2; font-size: 0.9em;">
      <strong>Description</strong><br>{{ talk.description }}
    </p>
  </div>
  
  {% if talk.playlist_image %}
  <div class="talks-video">
    <a href="{{ talk.video_id }}" title="Watch Video" target="_blank">
      <img src="{{ talk.playlist_image }}" alt="Playlist Preview" style="width: 100%; height: auto; display: block; margin: 0 auto;">
      <!-- Play button overlay -->
      <div class="play-button-overlay">
        <!-- SVG play button code -->
        <svg width="64" height="64" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
          <circle cx="34" cy="34" r="32" fill="rgba(255, 255, 255, 0.7)"/>
          <polygon points="27,20 27,48 49,34" fill="#000000"/>
        </svg>
      </div>
    </a>
  </div>
  {% elsif talk.youtube_id %}
  <div class="talks-video">
    <a href="http://www.youtube.com/watch?v={{ talk.youtube_id }}" title="Watch on YouTube" target="_blank">
      <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" style="width: 100%; height: auto; display: block; margin: 0 auto;">
      <!-- Play button overlay -->
      <div class="play-button-overlay">
        <!-- SVG play button code -->
        <svg width="64" height="64" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
          <circle cx="34" cy="34" r="32" fill="rgba(255, 255, 255, 0.7)"/>
          <polygon points="27,20 27,48 49,34" fill="#000000"/>
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
  grid-template-columns: 2fr 1fr;
  grid-gap: 20px;
  align-items: start;
}

.talks-content, .talks-video {
  padding: 10px;
}

.talks-video {
  position: relative;
  padding-top: 0; /* Remove padding from the top for better alignment of the play button */
}

.talks-video a {
  display: block;
  position: relative;
}

.play-button-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

@media (max-width: 767px) {
  .talks-entry {
    grid-template-columns: 1fr;
  }

  .talks-content, .talks-video {
    padding: 10px 0;
  }

  .talks-video {
    width: 100%; /* Ensure the video takes full width on small screens */
    padding-top: 0; /* Keep padding-top removed */
  }

  .talks-video a {
    margin-top: 20px; /* Add space between text and video on small screens */
  }
}
</style>
