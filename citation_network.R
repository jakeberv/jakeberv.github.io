
### web scraper for APIs

library(rvest)
library(dplyr)
library(httr)

# Function to scrape proxies
scrape_proxies <- function(url = "https://www.sslproxies.org/") {
  page <- read_html(url)
  proxy_table <- page %>%
    html_node("table") %>%
    html_table()
  
  proxies <- proxy_table %>%
    select(`IP Address`, Port) %>%
    mutate(Proxy = paste0(`IP Address`, ":", Port))
  
  as.list(proxies$Proxy)
}

# Function to perform a GET request using a random proxy with retry mechanism
perform_request_with_random_proxy <- function(url, proxy_list, max_retries = 5) {
  attempts <- 0
  while (attempts < max_retries) {
    # Correctly access the sampled proxy as a character string
    proxy <- sample(proxy_list, 1)[[1]]
    ip_port <- strsplit(proxy, ":")[[1]]
    response <- tryCatch({
      GET(url, use_proxy(ip_port[1], as.numeric(ip_port[2])))
    }, error = function(e) NULL)
    
    if (!is.null(response) && status_code(response) == 200) {
      return(content(response, "text", encoding = "UTF-8"))
    } else {
      attempts <- attempts + 1
      warning(paste("Attempt", attempts, ": Failed with status code", ifelse(is.null(response), "N/A", status_code(response))))
      Sys.sleep(runif(1, 1, 3)) # Random wait time between 1 and 3 seconds
    }
  }
  warning("All attempts to retrieve data failed.")
  NULL
}

# Main script to use the functions
proxy_list <- scrape_proxies()
example_url <- "https://api.semanticscholar.org/graph/v1/author/8480088/papers"
response_content <- perform_request_with_random_proxy(example_url, proxy_list)

# Function to print or handle the response
print_response <- function(response_content) {
  if (!is.null(response_content)) {
    print(response_content)
  } else {
    print("No response was received.")
  }
}

# Print the response
print_response(response_content)




## creating a citation network graph using R

install.packages("httr")
install.packages("jsonlite")
install.packages("igraph")
install.packages("reticulate")

library(httr)
library(jsonlite)
library(igraph)
library(reticulate)

# Function to get papers by author ID with explicit encoding
get_author_papers <- function(author_id) {
  url <- paste0("https://api.semanticscholar.org/graph/v1/author/", author_id, "/papers")
  response <- GET(url)
  
  # Check if the request was successful
  if (status_code(response) == 200) {
    content <- content(response, "text", encoding = "UTF-8")
    fromJSON(content)
  } else {
    stop("Failed to retrieve data: ", status_code(response))
  }
}

# Function to get citations for a specific paper
get_paper_citations <- function(paper_id) {
  url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", paper_id, "/citations")
  response <- GET(url)
  content <- content(response, "text")
  fromJSON(content)
}

author_id <- "8480088" #jacob's semantic scholar ID

# Get the list of papers
papers_data <- get_author_papers(author_id)
papers <- papers_data$data

# Initialize an empty edge list for the graph
edges <- data.frame(from = character(), to = character(), stringsAsFactors = FALSE)

# Loop over each paper to get its citations
for (paper in papers) {
  paper_id <- paper$paperId
  citations_data <- get_paper_citations(paper_id)
  citations <- citations_data$data
  
  # Add edges for first-degree citations
  for (citation in citations) {
    edges <- rbind(edges, data.frame(from = paper_id, to = citation$paperId))
  }
}

# Convert edges to a graph object
citation_network <- graph_from_data_frame(edges, directed = TRUE)

# Plot the network
plot(citation_network, vertex.size=5, vertex.label=NA, edge.arrow.size=0.5, main="Citation Network")

