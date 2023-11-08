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
<div style="display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; align-items: center; margin-bottom: 2em;">
  <div>
    <h2>{{ talk.title }}</h2>
    <p style="margin: 0.5em 0; line-height: 1.2;">
      <strong>Description</strong><br>{{ talk.description }}
    </p>
    <p style="line-height: 1.2;">
      <strong>Details</strong>
    </p>
    <ul style="line-height: 1.2; padding-left: 20px; margin: 0;">
      <li>Event: {{ talk.event }}</li>
      <li>Date: {{ talk.date }}</li>
      <li>Location: {{ talk.location }}</li>
    </ul>
    {% if talk.slides %}
    <p><a href="{{ talk.slides_url }}">View Slides</a></p>
    {% endif %}
  </div>
  
  {% if talk.youtube_id %}
  <div style="position: relative; padding-left: 10px;"> <!-- Add padding to ensure some space -->
    <a href="http://www.youtube.com/watch?v={{ talk.youtube_id }}" title="Watch on YouTube" style="display: block; position: relative;">
      <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" style="width: 80%; height: auto; display: block; margin: 0 auto;"> <!-- Reduced width -->
      <span style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        width: 60px; /* Increased play button size */
        height: 60px; /* Increased play button size */
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="60" height="60" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
          <mask id="mask{{ forloop.index }}" x="0" y="0" width="68" height="68" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="68" height="68" fill="white"/>
            <polygon points="29,22 29,46 48,34" fill="black"/>
          </mask>
          <circle cx="34" cy="34" r="30" fill="rgba(255, 255, 255, 0.7)" mask="url(#mask{{ forloop.index }})"/> <!-- Adjusted for new play button size -->
        </svg>
      </span>
    </a>
  </div>
  {% endif %}
</div>
{% endfor %}
