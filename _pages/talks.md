---
layout: archive
permalink: /talks/
title: "Talks"
header: 
  # og_image: "teaching/pdp.png"
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
        <img src="http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg" alt="YouTube Preview" style="width: 100%; height: auto;">
        <span style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(0, 0, 0, 0); /* Fully transparent */
          border-radius: 50%;
          width: 68px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="68" height="68" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
            <mask id="mask{{ forloop.index }}" x="0" y="0" width="68" height="68" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="68" height="68" fill="white"/>
              <!-- Define an equilateral triangle centered in the mask -->
              <polygon points="34,22 22,44 46,44" fill="black"/>
            </mask>
            <circle cx="34" cy="34" r="34" fill="rgba(255, 255, 255, 0.7)" mask="url(#mask{{ forloop.index }})"/>
          </svg>
        </span>
      </a>
    </div>
    {% endif %}
  </div>
</div>
{% endfor %}
