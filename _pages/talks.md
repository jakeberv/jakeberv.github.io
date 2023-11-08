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
<div style="display: flex; align-items: center; justify-content: start; margin-bottom: 2em;">
  <div style="flex: 1; padding-right: 20px;"> <!-- Adjust padding to control spacing -->
    <h2>{{ talk.title }}</h2>
    <p><strong>Description</strong><br>{{ talk.description }}</p>
    <p><strong>Details</strong></p>
    <ul>
      <li>Event: {{ talk.event }}</li>
      <li>Date: {{ talk.date }}</li>
      <li>Location: {{ talk.location }}</li>
    </ul>
    {% if talk.slides %}
    <p><a href="{{ talk.slides_url }}">View Slides</a></p>
    {% endif %}
  </div>
  
  {% if talk.youtube_id %}
  <div style="flex: 1; max-width: 280px; position: relative;">
    <a href="http://www.youtube.com/watch?v={{ talk.youtube_id }}" title="Watch on YouTube" style="display: block; position: relative;">
      <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" style="width: 100%; height: auto;">
      <span style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        width: 54px; /* Adjusted play button size */
        height: 54px; /* Adjusted play button size */
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="54" height="54" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
          <mask id="mask{{ forloop.index }}" x="0" y="0" width="68" height="68" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="68" height="68" fill="white"/>
            <polygon points="29,22 29,46 48,34" fill="black"/>
          </mask>
          <circle cx="34" cy="34" r="27" fill="rgba(255, 255, 255, 0.7)" mask="url(#mask{{ forloop.index }})"/>
        </svg>
      </span>
    </a>
  </div>
  {% endif %}
</div>
{% endfor %}
