---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

<figure style="max-width: 100%; display: flex; justify-content: space-between; align-items: center;">
  <a href="https://doi.org/10.1016/j.cub.2018.04.062" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/CurrBio.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Current Biology cover"/>
  </a>
  <a href="http://digitallibrary.amnh.org/handle/2246/7237" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/amnh_bulletin.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="AMNH Bulletin cover"/>
  </a>
  <a href="https://doi.org/10.1093/sysbio/syx064" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/syst_biol.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Systematic Biology cover"/>
  </a>
  <a href="https://doi.org/10.1126/sciadv.adp0114" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/science_advances.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Science Advances cover"/>
  </a>
</figure>


<br>


{% if author.googlescholar %} You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u> {% endif %}

{% include base_path %}

{% for post in site.publications reversed %} {% include archive-single-pubs.html %} {% endfor %}

---

See CV for other publications



