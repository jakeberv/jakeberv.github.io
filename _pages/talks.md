---
layout: archive
permalink: /talks/
title: "Talks"
header:
  og_image: "teaching/pdp.png"
author_profile: true
---

# Available recorded talks

{% for talk in site.data.talks %}
<div class="talks-entry" style="margin-bottom: 2em;">
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
    <a href="{{ talk.video_id }}" title="Watch Video" target="_blank" class="talks-video-link">
      <img src="{{ talk.playlist_image }}" alt="Playlist Preview" class="talks-preview-image">
      <div class="play-button-overlay">
        <!-- SVG play button code with mask cutout -->
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
  {% elsif talk.youtube_id %}
  <div class="talks-video">
    <a href="http://www.youtube.com/watch?v={{ talk.youtube_id }}" title="Watch on YouTube" target="_blank" class="talks-video-link">
      <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" class="talks-preview-image">
      <div class="play-button-overlay">
        <!-- Same SVG play button code -->
      </div>
    </a>
  </div>
  {% endif %}
</div>
{% endfor %}

<style>
/* Existing styles... */

.talks-video a {
  display: block;
  position: relative;
  overflow: hidden; /* Ensure no overflow from the scaling */
  transition: transform 0.3s, box-shadow 0.3s; /* Smooth transitions for hover effects */
}

.talks-video a:hover .talks-preview-image,
.talks-video a:focus .talks-preview-image {
  transform: scale(1.03); /* Slightly scale up the image */
  box-shadow: 0 6px 12px rgba(0,0,0,0.2); /* Add shadow for depth */
}

.talks-preview-image {
  transition: transform 0.3s, box-shadow 0.3s; /* Ensure the image transitions smoothly */
  display: block; /* Override any existing display properties */
  width: 100%; /* Full width of the container */
  height: auto; /* Maintain aspect ratio */
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
  z-index: 3; /* Ensures the overlay is on top */
}

@media (max-width: 767px) {
  /* Responsive adjustments... */
}
</style>
