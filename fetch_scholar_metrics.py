from scholarly import scholarly, ProxyGenerator
import json
import time

# Set up a proxy generator
pg = ProxyGenerator()
pg.FreeProxies()  # Fetches free proxies
scholarly.use_proxy(pg)

# Function to switch proxy
def switch_proxy():
    print("Switching proxy...")
    pg.FreeProxies()
    scholarly.use_proxy(pg)

# Search for your profile using your Google Scholar ID
try:
    author = scholarly.search_author_id('cQQaGZQAAAAJ')
    author = scholarly.fill(author, sections=['basics'])
    print(f"Fetched basic info for author: {author['name']}")
except Exception as e:
    print(f"Error fetching author data: {e}")
    exit(1)

# Extract overall metrics
scholar_data = {
    'h_index': author['hindex'],
    'i10_index': author['i10index'],
    'citations': author['citedby'],
    'publications': []
}

# Extract metrics for each publication with rotating proxies
for i, pub in enumerate(author['publications']):
    try:
        publication = scholarly.fill(pub)
        pub_data = {
            'title': publication['bib']['title'],
            'citations': publication['num_citations'],
            'year': publication['bib'].get('pub_year', 'N/A'),
            'venue': publication['bib'].get('venue', 'N/A')
        }
        scholar_data['publications'].append(pub_data)
        print(f"Fetched data for publication {i + 1}: {pub_data['title']}")
    except Exception as e:
        print(f"Error fetching data for publication {i + 1}: {e}")
        switch_proxy()  # Switch to a different proxy if an error occurs
        time.sleep(1)  # Wait for a few seconds before retrying
        continue  # Continue with the next publication

    time.sleep(1)  # Add a delay to avoid being rate-limited

# Save the data to a JSON file in the _data directory
try:
    with open('_data/scholar_metrics.json', 'w') as f:
        json.dump(scholar_data, f, indent=4)
    print("Successfully saved Google Scholar data to _data/scholar_metrics.json")
except Exception as e:
    print(f"Error saving data to file: {e}")
