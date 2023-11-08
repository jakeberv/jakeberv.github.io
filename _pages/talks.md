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
## {{ talk.title }}

{% if talk.youtube_id %}
### Video Preview
[![{{ talk.title }}](http://img.youtube.com/vi/{{ talk.youtube_id }}/0.jpg)](http://www.youtube.com/watch?v={{ talk.youtube_id }} "Watch on YouTube")

{% endif %}

### Description
{{ talk.description }}

### Details
- **Event**: {{ talk.event }}
- **Date**: {{ talk.date }}
- **Location**: {{ talk.location }}

{% if talk.slides %}
[View Slides]({{ talk.slides_url }})
{% endif %}

{% endfor %}
