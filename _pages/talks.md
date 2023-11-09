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
<div style="display: grid; grid-template-columns: 3fr 1.5fr; column-gap: 10px; align-items: center; margin-bottom: 2em;">
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
  <div style="position: relative; padding-left: 10px;">
    <a href="http://www.youtube.com/watch?v={{ talk.youtube_id }}" title="Watch on YouTube" style="display: block; position: relative;">
      <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" style="width: 75%; height: auto; display: block; margin: 0 auto;"> <!-- Increased width for larger preview -->
      <span style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        width: 64px; /* Kept play button size */
        height: 64px; /* Kept play button size */
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="64" height="64" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
          <mask id="mask{{ forloop.index }}" x="0" y="0" width="68" height="68" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="68" height="68" fill="white"/>
            <polygon points="27,20 27,48 49,34" fill="black"/> <!-- Adjusted points for the larger triangle -->
          </mask>
          <circle cx="34" cy="34" r="32" fill="rgba(255, 255, 255, 0.7)" mask="url(#mask{{ forloop.index }})"/> <!-- Adjusted radius for the larger play button -->
        </svg>
      </span>
    </a>
  </div>
  {% endif %}
</div>
{% endfor %}
