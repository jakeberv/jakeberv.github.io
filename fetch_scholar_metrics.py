from scholarly import scholarly, ProxyGenerator
import time
import json

# Set up a proxy generator
pg = ProxyGenerator()
success = pg.FreeProxies()  # Uses free proxies
scholarly.use_proxy(pg)

# Search for your profile using your Google Scholar ID
author = scholarly.search_author_id('cQQaGZQAAAAJ')
author = scholarly.fill(author)

# Extract overall metrics
scholar_data = {
    'h_index': author['hindex'],
    'i10_index': author['i10index'],
    'citations': author['citedby'],
    'publications': []
}

# Extract metrics for each publication
for pub in author['publications']:
    publication = scholarly.fill(pub)
    pub_data = {
        'title': publication['bib']['title'],
        'citations': publication['num_citations'],
        'year': publication['bib'].get('pub_year', 'N/A'),
        'venue': publication['bib'].get('venue', 'N/A')
    }
    scholar_data['publications'].append(pub_data)
    time.sleep(2)  # Add a delay to avoid rate-limiting

# Save the data to a JSON file in the _data directory
with open('_data/scholar_metrics.json', 'w') as f:
    json.dump(scholar_data, f, indent=4)
