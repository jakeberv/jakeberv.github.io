---
layout: about
permalink: /
title: "Jacob S. Berv"
excerpt: "Evolutionary and Systematic Biologist"
#title: "Jacob S. Berv, PhD"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
header:
  og_image: "research/persistence_of_memory-research.jpg"
  #image: "research/persistence_of_memory-about-header.jpg"
  overlay_image: "research/persistence_of_memory-about-header.jpg"
  overlay_filter: 0.35 # same as adding an opacity of 0.5 to a black background
  #caption: "**Salvador Dalí**"
  #actions:
  #  - label: "Download"
  #    url: "https://github.com"
---

# Welcome

<div class="wide-content">
  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
    <div style="width: 60%;">
      <p>I am an evolutionary biologist interested in building and deciphering the tree of life. My research integrates data from natural history, ecology, genomics, and paleontology---often through the application of novel computation tools---in order to understand the links between micro- and macroevolution.</p><p></p><p>I am currently supported by an <a href="https://midas.umich.edu/news/michigan-institute-for-data-science-announces-new-fellows/">Eric and Wendy Schmidt AI in Science Postdoctoral Fellowship</a> at the University of Michigan.</p>
    </div>
    <div class="twitter-container" style="width: 35%;">
      <a class="twitter-timeline" data-width="300" data-height="300" data-theme="light" href="https://twitter.com/jakeberv?ref_src=twsrc%5Etfw">Tweets by jakeberv</a>
      <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
    </div>
  </div>
</div>


<style>
  @media (max-width: 768px) {
    .twitter-container {
      display: none;
    }
  }
</style>


## Recent News
{% for item in site.news limit:5 %}
  <h4 style="font-size: 1.25em;">{{ item.title }}</h4>
  <p>{{ item.date | date: "%B %d, %Y" }} - {{ item.excerpt }}</p>
  <a href="{{ item.url | prepend: site.baseurl }}">Read more</a>
{% endfor %}

<br>

<small style="line-height: 1 !important; display: block; margin: 0;">
The site's banner is a portion of Salvador Dali's "Persistence of Memory." Dawn Adès wrote, "The soft watches are an unconscious symbol of the relativity of space and time, a Surrealist meditation on the collapse of our notions of a fixed cosmic order." In evolutionary biology, time is often relative and (outside of paleontology) rarely absolute. Dalí's olive tree with its cut branches, overlain by time, is a reminder of the challenges we face in understanding the tree of life. To the top left, an allusion to Charles Darwin's note, "I think", from his famous <a href="https://www.amnh.org/exhibitions/darwin/the-idea-takes-shape/i-think">illustration of a phylogenetic tree</a>.
</small>