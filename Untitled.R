## creating a citation network graph using R

install.packages("httr")
install.packages("jsonlite")
install.packages("igraph")
install.packages("reticulate")
install.packages("rvest")
install.packages("dplyr")

library(httr)
library(jsonlite)
library(igraph)
library(reticulate)
library(rvest)
library(dplyr)

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

# Function to scrape proxies from a JSON API
scrape_proxies_from_json <- function(url = "https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_format=protocolipport&format=json", 
                                     min_uptime = 50, max_avg_timeout = 500) {
  # Get the JSON data from the API
  response <- GET(url)
  
  if (status_code(response) == 200) {
    proxies_data <- fromJSON(content(response, "text", encoding = "UTF-8"))
    
    # Extract the proxies list
    proxies <- proxies_data$proxies
    
    # Filter proxies based on uptime and average timeout
    filtered_proxies <- proxies %>%
      filter(alive == TRUE, 
             anonymity == "elite",
             uptime >= min_uptime, 
             average_timeout <= max_avg_timeout) %>%
      mutate(Proxy = paste0(ip, ":", port)) %>%
      select(Proxy)
    
    # Return the list of proxies
    return(as.list(filtered_proxies$Proxy))
  } else {
    warning("Failed to retrieve proxy data.")
    return(NULL)
  }
}

# Function to perform a GET request with an optional proxy and retry mechanism
perform_request_with_optional_proxy <- function(url, proxy_list = NULL, max_retries = 50) {
  attempts <- 0
  
  cat("Starting request for URL:", url, "\n")
  
  # First attempt without a proxy
  cat("Attempting request without a proxy...\n")
  response <- tryCatch({
    GET(url)
  }, error = function(e) {
    cat("Error on first attempt without proxy:", conditionMessage(e), "\n")
    NULL
  })
  
  # If the response is successful, return it
  if (!is.null(response) && status_code(response) == 200) {
    cat("Successfully retrieved data without a proxy.\n")
    return(content(response, "text", encoding = "UTF-8"))
  } else {
    if (is.null(response)) {
      cat("First attempt failed: No response received.\n")
    } else {
      cat("First attempt failed with status code:", status_code(response), "\n")
    }
  }
  
  # If no proxy list is provided, skip proxy attempts
  if (is.null(proxy_list) || length(proxy_list) == 0) {
    cat("No proxy list provided. Skipping proxy attempts.\n")
    warning("All attempts to retrieve data failed without using proxies.")
    return(NULL)
  }
  
  # If the first attempt fails and proxy list is provided, try with proxies
  while (attempts < max_retries) {
    proxy <- sample(proxy_list, 1)[[1]]
    ip_port <- strsplit(proxy, ":")[[1]]
    cat("Attempt", attempts + 1, ": Trying with proxy", proxy, "\n")
    
    response <- tryCatch({
      GET(url, use_proxy(ip_port[1], as.numeric(ip_port[2])))
    }, error = function(e) {
      cat("Error on attempt", attempts + 1, "with proxy", proxy, ":", conditionMessage(e), "\n")
      NULL
    })
    
    if (!is.null(response) && status_code(response) == 200) {
      cat("Successfully retrieved data on attempt", attempts + 1, "with proxy", proxy, "\n")
      return(content(response, "text", encoding = "UTF-8"))
    } else {
      attempts <- attempts + 1
      if (is.null(response)) {
        cat("Attempt", attempts, "failed: No response received with proxy", proxy, "\n")
      } else {
        cat("Attempt", attempts, "failed with status code:", status_code(response), "using proxy", proxy, "\n")
      }
      warning(paste("Attempt", attempts, ": Failed with status code", ifelse(is.null(response), "N/A", status_code(response))))
    }
  }
  
  warning("All attempts to retrieve data failed.")
  cat("All attempts failed. Returning NULL.\n")
  NULL
}

# Function to perform a GET request using an API key, with explicit rate limit compliance
perform_request_with_apikey <- function(url, api_key, endpoint_type = "other", max_retries = 50) {
  attempts <- 0
  
  # Determine sleep time based on the endpoint type to comply with rate limits
  sleep_time <- ifelse(endpoint_type %in% c("/paper/batch", "/paper/search", "/recommendations"), 1, 0.1)
  
  cat("Starting request for URL:", url, "\n")
  
  # Initialize timer to manage rate limit
  last_request_time <- Sys.time()
  
  # Attempt to retrieve data using the API key
  while (attempts < max_retries) {
    cat("Attempt", attempts + 1, ": Trying with API key...\n")
    
    # Wait based on the time elapsed since the last request
    elapsed_time <- difftime(Sys.time(), last_request_time, units = "secs")
    if (elapsed_time < sleep_time) {
      Sys.sleep(sleep_time - elapsed_time)
    }
    
    response <- tryCatch({
      GET(url, add_headers(`x-api-key` = api_key))
    }, error = function(e) {
      cat("Error on attempt", attempts + 1, "with API key:", conditionMessage(e), "\n")
      NULL
    })
    
    # Update the last request time
    last_request_time <- Sys.time()
    
    if (!is.null(response) && status_code(response) == 200) {
      cat("Successfully retrieved data on attempt", attempts + 1, "with API key.\n")
      return(content(response, "text", encoding = "UTF-8"))
    } else if (!is.null(response) && status_code(response) == 429) {
      cat("Attempt", attempts + 1, "failed with status code 429: Too Many Requests. Respecting rate limit.\n")
      attempts <- attempts + 1
    } else {
      attempts <- attempts + 1
      if (is.null(response)) {
        cat("Attempt", attempts, "failed: No response received.\n")
      } else {
        cat("Attempt", attempts, "failed with status code:", status_code(response), "\n")
      }
    }
    
    # Warn only after all retries are exhausted
    if (attempts >= max_retries) {
      warning("All attempts to retrieve data failed.")
      cat("All attempts failed. Returning NULL.\n")
      return(NULL)
    }
  }
}

# Function to perform a GET request using an API key, with explicit rate limit compliance
perform_request_with_apikey <- function(url, api_key, endpoint_type = "other", max_retries = 50) {
  attempts <- 0
  sleep_time <- ifelse(endpoint_type %in% c("/paper/batch", "/paper/search", "/recommendations"), 1, 0.12)  # Increased buffer for general requests
  
  cat("Starting request for URL:", url, "\n")
  last_request_time <- Sys.time()  # Track the time of the last request
  
  while (attempts < max_retries) {
    elapsed_time <- difftime(Sys.time(), last_request_time, units = "secs")
    if (elapsed_time < sleep_time) {
      Sys.sleep(sleep_time - elapsed_time)
    }
    
    cat("Attempt", attempts + 1, "at", format(Sys.time(), "%H:%M:%S"), ": Trying with API key...\n")
    response <- tryCatch({
      GET(url, add_headers(`x-api-key` = api_key))
    }, error = function(e) {
      cat("Error on attempt", attempts + 1, ":", conditionMessage(e), "\n")
      NULL
    })
    
    last_request_time <- Sys.time()  # Update last request time after the response
    cat("Response received at", format(Sys.time(), "%H:%M:%S"), "\n")
    
    if (!is.null(response) && status_code(response) == 200) {
      cat("Successfully retrieved data on attempt", attempts + 1, ".\n")
      return(content(response, "text", encoding = "UTF-8"))
    } else if (!is.null(response) && status_code(response) == 429) {
      cat("Received 429: Too Many Requests. Next attempt after waiting.\n")
      attempts <- attempts + 1
    } else {
      cat("Failed with status code:", ifelse(is.null(response), "No Response", status_code(response)), "\n")
      attempts <- attempts + 1
    }
    
    if (attempts >= max_retries) {
      warning("All attempts to retrieve data failed.")
      cat("All attempts failed. Returning NULL.\n")
      return(NULL)
    }
  }
}


api_key <- "1F1GiklgWi6lRhvqInrQj6J00LDtpcUV3EiuAKvi"

# Function to get papers by author ID with an optional proxy
get_author_papers <- function(author_id, proxy_list) {
  url <- paste0("https://api.semanticscholar.org/graph/v1/author/", author_id, "/papers")
  response_content <- perform_request_with_optional_proxy(url, proxy_list)
  
  if (!is.null(response_content)) {
    fromJSON(response_content)
  } else {
    stop("Failed to retrieve data after multiple attempts.")
  }
}

# Function to get papers by author ID using the API key
get_author_papers <- function(author_id, api_key) {
  url <- paste0("https://api.semanticscholar.org/graph/v1/author/", author_id, "/papers")
  response_content <- perform_request_with_apikey(url, api_key, endpoint_type = "/author/papers")
  
  if (!is.null(response_content)) {
    fromJSON(response_content)
  } else {
    stop("Failed to retrieve data after multiple attempts.")
  }
}

# Scrape proxy list
#proxy_list <- scrape_proxies()
#proxy_list <- scrape_proxies_from_json()

# Example Usage
author_id <- "8480088" # Example author ID

# Get the list of papers
papers_data <- get_author_papers(author_id, api_key)
papers <- papers_data$data

# Function to get the IDs of citing papers for each paper of an author with diagnostic print statements
get_all_citing_paper_ids <- function(papers_data, proxy_list, limit = 1000) {
  # Initialize an empty list to store citing papers
  citing_papers_list <- list()
  
  # Function to get the IDs of citing papers for a specific paper
  get_citing_paper_ids <- function(paper_id, proxy_list, limit) {
    offset <- 0
    all_citing_paper_ids <- c()
    total_citations_retrieved <- 0
    
    repeat {
      # Diagnostic print statement
      print(paste("Fetching citing papers for paper ID:", paper_id, "with offset:", offset))
      
      url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", paper_id, 
                    "/citations?fields=paperId&offset=", offset, "&limit=", limit)
      response_content <- perform_request_with_optional_proxy(url, proxy_list)
      
      if (!is.null(response_content)) {
        citation_data <- fromJSON(response_content)
        citing_paper_ids <- sapply(citation_data$data, function(citation) citation$paperId)
        
        # Append the retrieved IDs to the list of all citing paper IDs
        all_citing_paper_ids <- c(all_citing_paper_ids, citing_paper_ids)
        total_citations_retrieved <- total_citations_retrieved + length(citing_paper_ids)
        
        # Diagnostic print statement
        print(paste("Retrieved", length(citing_paper_ids), "citing papers. Total so far:", total_citations_retrieved))
        
        # Check if there are more citations to fetch
        if (length(citing_paper_ids) < limit) {
          print(paste("Finished fetching citations for paper ID:", paper_id))
          break
        } else {
          offset <- offset + limit
        }
      } else {
        warning(paste("Failed to retrieve citing papers for paper ID:", paper_id))
        break
      }
    }
    
    return(all_citing_paper_ids)
  }
  
  # Loop through each paper in the provided papers_data
  for (i in 1:nrow(papers_data)) {
    paper_id <- papers_data$paperId[i]
    
    # Diagnostic print statement
    print(paste("Starting citation retrieval for paper", i, "of", nrow(papers_data), "with ID:", paper_id))
    
    citing_paper_ids <- get_citing_paper_ids(paper_id, proxy_list, limit)
    
    # Store the result in a list with the paper ID as the key
    if (length(citing_paper_ids) > 0) {
      citing_papers_list[[paper_id]] <- citing_paper_ids
    }
    
    # Diagnostic print statement
    print(paste("Completed citation retrieval for paper", i, "of", nrow(papers_data)))
  }
  
  return(citing_papers_list)
}

# Function to get the IDs of citing papers for each paper of an author using an API key
get_all_citing_paper_ids <- function(papers_data, api_key, limit = 1000) {
  # Initialize an empty list to store citing papers
  citing_papers_list <- list()
  
  # Function to get the IDs of citing papers for a specific paper
  get_citing_paper_ids <- function(paper_id, api_key, limit) {
    offset <- 0
    all_citing_paper_ids <- c()
    total_citations_retrieved <- 0
    
    repeat {
      # Diagnostic print statement
      print(paste("Fetching citing papers for paper ID:", paper_id, "with offset:", offset))
      
      url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", paper_id, 
                    "/citations?fields=paperId&offset=", offset, "&limit=", limit)
      response_content <- perform_request_with_apikey(url, api_key, endpoint_type = "/paper/citations")
      
      if (!is.null(response_content)) {
        citation_data <- fromJSON(response_content)
        citing_paper_ids <- sapply(citation_data$data, function(citation) citation$paperId)
        
        # Append the retrieved IDs to the list of all citing paper IDs
        all_citing_paper_ids <- c(all_citing_paper_ids, citing_paper_ids)
        total_citations_retrieved <- total_citations_retrieved + length(citing_paper_ids)
        
        # Diagnostic print statement
        print(paste("Retrieved", length(citing_paper_ids), "citing papers. Total so far:", total_citations_retrieved))
        
        # Check if there are more citations to fetch
        if (length(citing_paper_ids) < limit) {
          print(paste("Finished fetching citations for paper ID:", paper_id))
          break
        } else {
          offset <- offset + limit
        }
      } else {
        warning(paste("Failed to retrieve citing papers for paper ID:", paper_id))
        break
      }
    }
    
    return(all_citing_paper_ids)
  }
  
  # Loop through each paper in the provided papers_data
  for (i in 1:nrow(papers_data)) {
    paper_id <- papers_data$paperId[i]
    
    # Diagnostic print statement
    print(paste("Starting citation retrieval for paper", i, "of", nrow(papers_data), "with ID:", paper_id))
    
    citing_paper_ids <- get_citing_paper_ids(paper_id, api_key, limit)
    
    # Store the result in a list with the paper ID as the key
    if (length(citing_paper_ids) > 0) {
      citing_papers_list[[paper_id]] <- citing_paper_ids
    }
    
    # Diagnostic print statement
    print(paste("Completed citation retrieval for paper", i, "of", nrow(papers_data)))
  }
  
  return(citing_papers_list)
}

# Example usage:
# Assuming 'papers' is the data frame obtained from get_author_papers
citing_papers <- get_all_citing_paper_ids(papers, api_key)

##get details
get_citing_paper_details <- function(citing_papers, proxy_list) {
  
  citing_papers_details <- list()
  
  fields <- "venue,publicationVenue,year,authors,citationCount"
  
  for (author_paper_id in names(citing_papers)) {
    cat("Processing citing papers for author paper ID:", author_paper_id, "\n")
    
    paper_details <- data.frame(
      citing_paper_id = character(),
      venue = character(),
      publicationVenue_name = character(),
      publicationVenue_issn = character(),
      year = integer(),
      authors = list(),
      citationCount = integer(),
      stringsAsFactors = FALSE
    )
    
    for (citing_paper_id in citing_papers[[author_paper_id]]) {
      cat("  Retrieving details for citing paper ID:", citing_paper_id, "\n")
      
      url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", citing_paper_id, "?fields=", fields)
      
      response_content <- tryCatch({
        perform_request_with_optional_proxy(url, proxy_list)
      }, error = function(e) {
        warning(paste("Failed to retrieve details for citing paper ID:", citing_paper_id, "- Error:", e$message))
        return(NULL)
      })
      
      if (!is.null(response_content)) {
        paper_data <- fromJSON(response_content)
        
        publicationVenue_name <- ifelse(!is.null(paper_data$publicationVenue$name), paper_data$publicationVenue$name, NA)
        publicationVenue_issn <- ifelse(!is.null(paper_data$publicationVenue$issn), paper_data$publicationVenue$issn, NA)
        
        paper_details <- rbind(paper_details, data.frame(
          citing_paper_id = paper_data$paperId,
          venue = ifelse(!is.null(paper_data$venue), paper_data$venue, NA),
          publicationVenue_name = publicationVenue_name,
          publicationVenue_issn = publicationVenue_issn,
          year = ifelse(!is.null(paper_data$year), paper_data$year, NA),
          authors = list(paper_data$authors),
          citationCount = ifelse(!is.null(paper_data$citationCount), paper_data$citationCount, NA),
          stringsAsFactors = FALSE
        ))
      } else {
        warning(paste("No response content for citing paper ID:", citing_paper_id))
      }
    }
    
    citing_papers_details[[author_paper_id]] <- paper_details
    cat("Completed processing for author paper ID:", author_paper_id, "\n")
  }
  
  return(citing_papers_details)
}

# Function to retrieve detailed information for citing papers using an API key
get_citing_paper_details <- function(citing_papers, api_key) {
  citing_papers_details <- list()
  
  fields <- "title,venue,publicationVenue,year,authors,citationCount"
  
  for (author_paper_id in names(citing_papers)) {
    cat("Processing citing papers for author paper ID:", author_paper_id, "\n")
    
    paper_details <- list()  # Use list to gather all data
    
    for (citing_paper_id in citing_papers[[author_paper_id]]) {
      cat("  Retrieving details for citing paper ID:", citing_paper_id, "\n")
      
      url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", citing_paper_id, "?fields=", fields)
      
      response_content <- tryCatch({
        perform_request_with_apikey(url, api_key)
      }, error = function(e) {
        warning(paste("Failed to retrieve details for citing paper ID:", citing_paper_id, "- Error:", e$message))
        return(NULL)
      })
      
      if (!is.null(response_content)) {
        paper_data <- fromJSON(response_content)
        
        # Prepare a structured list for the current citing paper
        current_paper_details <- list(
          citing_paper_id = paper_data$paperId,
          venue = paper_data$venue,
          publicationVenue_name = ifelse(!is.null(paper_data$publicationVenue$name), paper_data$publicationVenue$name, NA),
          publicationVenue_issn = ifelse(!is.null(paper_data$publicationVenue$issn), paper_data$publicationVenue$issn, NA),
          year = paper_data$year,
          authors = paper_data$authors,  # Directly use authors list
          citationCount = paper_data$citationCount
        )
        
        # Append to the paper details list
        paper_details[[length(paper_details) + 1]] <- current_paper_details
      } else {
        warning(paste("No response content for citing paper ID:", citing_paper_id))
      }
    }
    
    # Store structured list in the main list with the author_paper_id as the key
    citing_papers_details[[author_paper_id]] <- paper_details
    cat("Completed processing for author paper ID:", author_paper_id, "\n")
  }
  
  return(citing_papers_details)
}

#retrieive the details about papers that cite my papers
citing_paper_details <- get_citing_paper_details(citing_papers[1], api_key)


get_citing_paper_details(citing_papers[1], api_key)




##

# Function to perform API requests over a set of URLs with specific rate limit enforcement
request_multiple <- function(urls, api_key) {
  results <- list()
  last_request_time <- Sys.time()  # Track the time of the last request
  
  # Function to determine the rate limit based on URL
  get_rate_limit <- function(url) {
    if (grepl("/paper/batch|/paper/search|/recommendations", url)) {
      return(1.1)  # 1 request per second for specific endpoints
    } else {
      return(0.25)  # 10 requests per second for all other endpoints
    }
  }
  
  # Centralizing the timing control with retry logic
  for (url in urls) {
    success <- FALSE
    attempt <- 1
    max_retries <- 10  # Maximum number of retries
    
    while (!success && attempt <= max_retries) {
      rate_limit <- get_rate_limit(url)
      Sys.sleep(max(0, rate_limit - as.numeric(difftime(Sys.time(), last_request_time, units = "secs"))))
      
      # Perform the API request
      response <- perform_request_with_apikey(url, api_key)
      
      # Check for a successful response or a 429 error
      if (!is.null(response) && grepl("429", response)) {
        cat("429 Too Many Requests. Retrying after sleep.\n")
        
        # Ensure we respect the rate limit even on retry
        Sys.sleep(rate_limit)
        attempt <- attempt + 1
      } else {
        success <- TRUE
        # Save the response
        results[[length(results) + 1]] <- response
        
        # Update the last request time after a successful call
        last_request_time <- Sys.time()
        
        # Optional: Print to track progress
        cat("Completed request for:", url, "at", format(Sys.time(), "%T"), "with sleep time of", rate_limit, "seconds\n")
      }
    }
    
    # If all attempts fail, record a failure message
    if (!success) {
      warning(paste("Failed to retrieve data for URL after multiple attempts:", url))
      results[[length(results) + 1]] <- NULL
    }
  }
  
  return(results)
}

# Function to perform API requests over a set of URLs with specific rate limit enforcement
request_multiple <- function(urls, api_key) {
  results <- list()
  last_request_time <- Sys.time()  # Track the time of the last request
  
  # Function to determine the rate limit based on URL
  get_rate_limit <- function(url) {
    if (grepl("/paper/batch|/paper/search|/recommendations", url)) {
      return(1.1)  # 1 request per second for specific endpoints
    } else {
      return(0.25)  # 10 requests per second for all other endpoints
    }
  }
  
  # Centralizing the timing control with retry logic
  for (url in urls) {
    success <- FALSE
    attempt <- 1
    max_retries <- 10  # Maximum number of retries
    
    while (!success && attempt <= max_retries) {
      rate_limit <- get_rate_limit(url)
      Sys.sleep(max(0, rate_limit - as.numeric(difftime(Sys.time(), last_request_time, units = "secs"))))
      
      # Perform the API request
      response <- perform_request_with_apikey(url, api_key)
      
      # Check if the response is valid and contains a 429 status code
      if (!is.null(response) && is.list(response) && "status" %in% names(response) && response$status == 429) {
        cat("429 Too Many Requests. Retrying after sleep.\n")
        
        # Ensure we respect the rate limit even on retry
        Sys.sleep(rate_limit)
        attempt <- attempt + 1
      } else {
        success <- TRUE
        # Save the response
        results[[length(results) + 1]] <- response
        
        # Update the last request time after a successful call
        last_request_time <- Sys.time()
        
        # Optional: Print to track progress
        cat("Completed request for:", url, "at", format(Sys.time(), "%T"), "with sleep time of", rate_limit, "seconds\n")
      }
    }
    
    # If all attempts fail, record a failure message
    if (!success) {
      warning(paste("Failed to retrieve data for URL after multiple attempts:", url))
      results[[length(results) + 1]] <- NULL
    }
  }
  
  return(results)
}


