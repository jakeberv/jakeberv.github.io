from scholarly import scholarly, ProxyGenerator
import json
import time

# Set up a proxy generator (optional)
pg = ProxyGenerator()
pg.FreeProxies()  # Fetches free proxies
scholarly.use_proxy(pg)

# Function to switch proxy (if needed)
def switch_proxy():
    print("Switching proxy...")
    pg.FreeProxies()
    scholarly.use_proxy(pg)

# Function to fetch publication details with retry mechanism
def fetch_publication_details(pub):
    attempts = 0
    while attempts < 3:
        try:
            pub_filled = scholarly.fill(pub)  # Fill in the details of the publication
            return {
                'title': pub_filled['bib'].get('title', 'N/A'),
                'citations': pub_filled.get('num_citations', 0),
                'year': pub_filled['bib'].get('pub_year', 'N/A'),
                'venue': pub_filled['bib'].get('venue', 'N/A'),
                'url': pub_filled.get('pub_url', 'N/A')
            }
        except Exception as e:
            print(f"Error fetching data for publication, attempt {attempts + 1}: {e}")
            attempts += 1
            switch_proxy()  # Switch to a new proxy
            time.sleep(1)  # Wait a bit before retrying
    print("Failed to fetch publication data after 3 attempts.")
    return None

# Search for your profile using your Google Scholar ID
try:
    author = scholarly.search_author_id('cQQaGZQAAAAJ')
    author = scholarly.fill(author, sections=['basics', 'indices', 'coauthors', 'counts', 'publications', 'public_access'])
    print(f"Fetched basic info for author: {author.get('name', 'Unknown')}")
except Exception as e:
    print(f"Error fetching author data: {e}")
    exit(1)

# Extract data for each publication
publications_data = []
for pub in author.get('publications', []):
    pub_details = fetch_publication_details(pub)
    if pub_details:
        publications_data.append(pub_details)

# Extract and print the desired data
scholar_data = {
    'name': author.get('name', 'N/A'),
    'affiliation': author.get('affiliation', 'N/A'),
    'email_domain': author.get('email_domain', 'N/A'),
    'h_index': author.get('hindex', 'N/A'),
    'i10_index': author.get('i10index', 'N/A'),
    'citations': author.get('citedby', 'N/A'),
    'cites_per_year': author.get('cites_per_year', {}),
    'interests': author.get('interests', []),
    'coauthors': [{'name': coauthor.get('name', 'N/A'),
                   'affiliation': coauthor.get('affiliation', 'N/A'),
                   'scholar_id': coauthor.get('scholar_id', 'N/A')}
                  for coauthor in author.get('coauthors', [])],
    'profile_picture': author.get('url_picture', 'N/A'),
    'homepage': author.get('homepage', 'N/A'),
    'organization': author.get('organization', 'N/A'),
    'public_access': author.get('public_access', 'N/A'),
    'total_publications': len(author.get('publications', [])),
    'publications': publications_data  # Add detailed data for each publication
}

# Print the gathered information for debugging purposes
print(json.dumps(scholar_data, indent=4))

# Save the data to a JSON file in the _data directory
try:
    with open('_data/scholar_metrics.json', 'w') as f:
        json.dump(scholar_data, f, indent=4)
    print("Successfully saved Google Scholar data to _data/scholar_metrics.json")
except Exception as e:
    print(f"Error saving data to file: {e}")
