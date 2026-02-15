---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% comment %}
Auto-select the most recent CV PDF in /files/pdf/ based on filename sorting.
REQUIREMENT: CV filenames must sort chronologically, e.g. BERV_YYYY_MM_DD.pdf
Example: BERV_2026_02_02.pdf
{% endcomment %}

{% assign cv_candidates = site.static_files
  | where_exp: "f", "f.extname == '.pdf'"
  | where_exp: "f", "f.path contains '/files/pdf/'"
  | where_exp: "f", "f.name contains 'BERV_'"
%}

{% assign cv_sorted = cv_candidates | sort: "name" %}
{% assign cv_latest = cv_sorted | last %}

{% if cv_latest %}
You can download a PDF copy of my CV [here]({{ cv_latest.path | relative_url }}).
{% else %}
**CV PDF not found.** Please upload a PDF to `/files/pdf/` with a name like `BERV_2026_02_02.pdf`.
{% endif %}

{% if cv_latest %}
<div style="overflow: auto;">
  <iframe
    class="cv-iframe"
    src="{{ cv_latest.path | relative_url }}"
    height="500"
    frameborder="no"
    border="0"
    marginwidth="0"
    marginheight="0"
    title="CV PDF">
  </iframe>
</div>
{% endif %}