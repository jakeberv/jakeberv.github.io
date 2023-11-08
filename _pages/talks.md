---
layout: archive
permalink: /talks/
title: "Talks"
header: 
  #og_image: "teaching/pdp.png"
author_profile: true
---

# Talks

This page lists recorded talks I've given at conferences, workshops, and other venues.

{% for talk in site.data.talks %}
<div style="margin-bottom: 2em;">
  <h2 style="margin-bottom: 0;">{{ talk.title }}</h2>
  
  <div style="display: flex; align-items: flex-start; gap: 5px;">
    <div style="flex-grow: 2;">
      <p><strong>Description</strong><br>
      {{ talk.description }}</p>
      
      <p><strong>Details</strong><br>
      - <strong>Event</strong>: {{ talk.event }}<br>
      - <strong>Date</strong>: {{ talk.date }}<br>
      - <strong>Location</strong>: {{ talk.location }}</p>
      
      {% if talk.slides %}
      <p><a href="{{ talk.slides_url }}">View Slides</a></p>
      {% endif %}
    </div>
    
    {% if talk.youtube_id %}
    <div style="flex-grow: 1; max-width: 280px; position: relative; margin-left: 10px;">
      <a href="http://www.youtube.com/watch?v={{ talk.youtube_id }}" title="Watch on YouTube" style="display: block; position: relative;">
        <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" style="width: 100%; height: auto; border: 1px solid #ccc;">
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg viewBox="0 0 68 48" style="width:36px;height:36px;">
            <path d="M 45,24 27,14 27,34" fill="#fff"></path>
          </svg>
        </span>
      </a>
    </div>
    {% endif %}
  </div>
</div>
{% endfor %}
