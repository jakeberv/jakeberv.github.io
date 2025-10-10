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
library(R.utils)

api_key <- "1F1GiklgWi6lRhvqInrQj6J00LDtpcUV3EiuAKvi"
# Example Usage
author_id <- "8480088" # Example author ID

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

# Function to perform a GET request using an API key with enhanced feedback and error handling
perform_request_with_apikey <- function(url, api_key) {
  cat("Sending request for URL:", url, "\n")
  
  # Perform the request with error handling
  response <- tryCatch({
    GET(url, add_headers(`x-api-key` = api_key))
  }, error = function(e) {
    cat("Error with API key on request:", conditionMessage(e), "\n")
    NULL  # Return NULL on error to gracefully handle in subsequent logic
  })
  
  # Check the response status and handle accordingly
  if (!is.null(response) && status_code(response) == 200) {
    cat("Successfully retrieved data for URL:", url, "\n")
    return(content(response, "text", encoding = "UTF-8"))
  } else {
    statusCode <- ifelse(is.null(response), "No Response", status_code(response))
    cat("Request failed with status code:", statusCode, "\n")
    return(NULL)
  }
}

perform_batch_request_with_apikey <- function(api_key, paper_ids, fields = "title,venue,publicationVenue,year,authors,citationCount") {
  url <- "https://api.semanticscholar.org/graph/v1/paper/batch"
  
  cat("Sending POST request for", length(paper_ids), "paper IDs with fields:", fields, "\n")
  
  response <- httr::POST(
    url,
    httr::add_headers(`x-api-key` = api_key),
    body = list(ids = paper_ids),
    encode = "json",
    query = list(fields = fields)
  )
  
  status <- httr::status_code(response)
  
  if (status == 200) {
    cat("Successfully retrieved data for batch request.\n")
    return(httr::content(response, "text", encoding = "UTF-8"))
  } else {
    cat("Request failed with status code:", status, "\n")
    return(NULL)
  }
}


# Function to get papers by author ID using the API key
get_author_papers <- function(author_id, api_key) {
  url <- paste0("https://api.semanticscholar.org/graph/v1/author/", author_id, "/papers")
  response_content <- perform_request_with_apikey(url, api_key)
  
  if (!is.null(response_content)) {
    fromJSON(response_content)
  } else {
    stop("Failed to retrieve data after multiple attempts.")
  }
}

# Get the list of papers
papers_data <- get_author_papers(author_id, api_key)
papers <- papers_data$data

# Function to perform API requests over a set of URLs with specific rate limit enforcement
request_multiple <- function(urls, api_key) {
  results <- list()
  queue <- list()
  
  # Function to determine the rate limit based on URL
  get_rate_limit <- function(url) {
    if (grepl("/paper/batch|/paper/search|/recommendations", url)) {
      return(1.5)  # Use 1.5 seconds per request for specific endpoints
    } else {
      return(1.0)  # Use 1.0 seconds per request for other endpoints
    }
  }
  
  # Populate the queue with URLs and their respective rate limits
  for (url in urls) {
    queue <- append(queue, list(list(url = url, rate_limit = get_rate_limit(url))))
  }
  
  # Centralized queue processing
  last_request_time <- Sys.time()
  retry_delay <- 0.5  # Fixed retry delay for 429 errors and timeouts
  
  while (length(queue) > 0) {
    # Get the first request from the queue
    request <- queue[[1]]
    
    # Calculate how much time has passed since the last request
    time_since_last_request <- as.numeric(difftime(Sys.time(), last_request_time, units = "secs"))
    
    # If necessary, wait for the appropriate rate limit time
    if (time_since_last_request < request$rate_limit) {
      Sys.sleep(request$rate_limit - time_since_last_request)
    }
    
    # Start timing the request
    start_time <- Sys.time()
    
    # Perform the API request with a timeout
    response <- tryCatch({
      withTimeout({
        perform_request_with_apikey(request$url, api_key)
      }, timeout = 20)  # Set timeout to 20 seconds
    }, TimeoutException = function(ex) {
      NULL  # Return NULL if the request times out
    }, error = function(e) {
      NULL  # Handle other potential errors
    })
    
    # Measure how long the request took
    request_duration <- as.numeric(difftime(Sys.time(), start_time, units = "secs"))
    
    # Check if the request timed out or failed
    if (is.null(response) || request_duration > 20) {
      cat("Request timed out or failed. Skipping...\n")
      Sys.sleep(retry_delay)  # Apply fixed delay before continuing
      queue <- queue[-1]  # Remove the failed request from the queue
      next  # Skip to the next request
    }
    
    # Success, store the result
    results[[length(results) + 1]] <- response
    
    # Reset last request time on successful request
    last_request_time <- Sys.time()
    
    cat("Completed request for:", request$url, "at", format(Sys.time(), "%T"), "with sleep time of", request$rate_limit, "seconds\n")
    
    # Remove the processed request from the queue
    queue <- queue[-1]
  }
  
  return(results)
}

{
# Sample URL (replace with an actual Semantic Scholar paper endpoint or similar)
sample_url <- "https://api.semanticscholar.org/graph/v1/paper/649def34f8be52c8b66281af98ae884c09aef38b?fields=authors,title,venue"
# Create a list with the same URL repeated 10 times
test_urls <- rep(sample_url, 10)

# Call the function
results <- request_multiple(test_urls, api_key)

#all tests pass, no 429

# Creating a list of URLs for the `/paper/search` endpoint as an example
test_urls <- c(
  "https://api.semanticscholar.org/graph/v1/paper/search?query=artificial+intelligence&fields=authors,title",
  "https://api.semanticscholar.org/graph/v1/paper/search?query=machine+learning&fields=authors,title",
  "https://api.semanticscholar.org/graph/v1/paper/search?query=deep+learning&fields=authors,title",
  "https://api.semanticscholar.org/graph/v1/paper/search?query=neural+networks&fields=authors,title",
  "https://api.semanticscholar.org/graph/v1/paper/search?query=natural+language+processing&fields=authors,title"
)

# Call the function
results <- request_multiple(test_urls, api_key)

#all tests pass, no 429
}

# Function to get the IDs of citing papers for each paper of an author using an API key
get_all_citing_paper_ids <- function(papers_data, api_key, limit = 1000, max_retries = 10) {
  # Initialize an empty list to store citing papers
  citing_papers_list <- list()
  
  # Set the rate limit for the endpoint
  rate_limit <- 0.5  # Adjusted for quicker calls, 1 request per 0.5 seconds
  
  # Function to get the IDs of citing papers for a specific paper
  get_citing_paper_ids <- function(paper_id, api_key, limit, max_retries) {
    offset <- 0
    all_citing_paper_ids <- c()
    last_request_time <- Sys.time()  # Initialize the last request time
    
    repeat {
      if (offset >= 9000 && (offset + limit) >= 10000) {
        warning("API limit reached: offset + limit must be < 10000. Stopping further requests.")
        break
      }
      
      # Handle rate limiting
      elapsed_time <- difftime(Sys.time(), last_request_time, units = "secs")
      if (elapsed_time < rate_limit) {
        Sys.sleep(rate_limit - elapsed_time)
      }
      
      # Construct the API request URL
      url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", paper_id, 
                    "/citations?fields=paperId&offset=", offset, "&limit=", limit)
      
      attempt <- 0
      response_content <- NULL
      
      repeat {
        attempt <- attempt + 1
        response_content <- perform_request_with_apikey(url, api_key)
        
        if (!is.null(response_content) && !grepl('"error":', response_content)) {
          break  # If response is successful, parse it and break out of the retry loop
        } else if (attempt >= max_retries) {
          stop("Max retries reached for paper ID: ", paper_id)  # Exit the function if max retries reached
        } else {
          Sys.sleep(rate_limit)  # If failed but not reached max retries, sleep and then retry
        }
      }
      
      last_request_time <- Sys.time()  # Update the last request time after the API call
      
      if (!is.null(response_content)) {
        citation_data <- fromJSON(response_content)
        citing_paper_ids <- sapply(citation_data$data, function(citation) citation$paperId)
        
        # Append the retrieved IDs to the list of all citing paper IDs
        all_citing_paper_ids <- c(all_citing_paper_ids, citing_paper_ids)
        
        # Check if there are more citations to fetch
        if (length(citing_paper_ids) < limit) {
          print(paste("Finished fetching citations for paper ID:", paper_id))
          break
        } else {
          offset <- offset + limit
        }
      } else {
        print("API returned an error or empty response, stopping retrieval.")
        break
      }
    }
    
    return(all_citing_paper_ids)
  }
  
  # Loop through each paper in the provided papers_data
  for (i in 1:nrow(papers_data)) {
    paper_id <- papers_data$paperId[i]
    print(paste("Starting citation retrieval for paper", i, "of", nrow(papers_data), "with ID:", paper_id))
    
    citing_paper_ids <- get_citing_paper_ids(paper_id, api_key, limit, max_retries)
    
    if (!is.null(citing_paper_ids) && length(citing_paper_ids) > 0) {
      citing_papers_list[[paper_id]] <- citing_paper_ids
    }
    
    print(paste("Completed citation retrieval for paper", i, "of", nrow(papers_data)))
  }
  
  return(citing_papers_list)
}

# Assuming 'papers' is the data frame obtained from get_author_papers
citing_papers <- get_all_citing_paper_ids(papers, api_key)

# Function to retrieve detailed information for citing papers using an API key
get_citing_paper_details <- function(citing_papers, api_key) {
  citing_papers_details <- list()
  
  fields <- "title,venue,publicationVenue,year,authors,citationCount"
  rate_limit_delay <- 0.15  # Set a delay time (in seconds) to respect API rate limits
  
  for (author_paper_id in names(citing_papers)) {
    cat("Processing citing papers for author paper ID:", author_paper_id, "\n")
    
    paper_details <- list()  # Use list to gather all data
    
    # Prepare URLs for all citing papers
    urls <- sapply(citing_papers[[author_paper_id]], function(citing_paper_id) {
      paste0("https://api.semanticscholar.org/graph/v1/paper/", citing_paper_id, "?fields=", fields)
    })
    
    # Use request_multiple to fetch all details
    responses <- request_multiple(urls, api_key)
    
    # Rate limiting: Introduce a delay after each batch of requests
    Sys.sleep(rate_limit_delay)
    
    for (i in seq_along(responses)) {
      response_content <- responses[[i]]
      
      if (!is.null(response_content)) {
        paper_data <- fromJSON(response_content)
        
        # Prepare a structured list for the current citing paper
        current_paper_details <- list(
          citing_paper_id = paper_data$paperId,
          title = paper_data$title,
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
        warning(paste("No response content for citing paper ID:", citing_papers[[author_paper_id]][i]))
      }
    }
    
    # Store structured list in the main list with the author_paper_id as the key
    citing_papers_details[[author_paper_id]] <- paper_details
    cat("Completed processing for author paper ID:", author_paper_id, "\n")
  }
  
  return(citing_papers_details)
}

#get citing paper details
citing_paper_details<-get_citing_paper_details(citing_papers, api_key)

## get the batch search to work
citing_paper_detail_batch <- function(citing_papers, api_key, batch_size = 500) {
  fields <- "paperId,title,venue,publicationVenue,year,authors,citationCount"
  citing_papers_details <- list()
  
  # Check for any NA values in author paper IDs and stop if found
  if (any(is.na(names(citing_papers)))) {
    stop("Error: One or more author paper IDs are NA. Operation aborted.")
  }
  
  # Iterate over each author paper ID (sub-list)
  for (author_paper_id in names(citing_papers)) {
    citing_paper_ids <- citing_papers[[author_paper_id]]
    
    # Filter out NA citing paper IDs and show a warning if any are found
    valid_citing_paper_ids <- citing_paper_ids[!is.na(citing_paper_ids)]
    if (length(valid_citing_paper_ids) < length(citing_paper_ids)) {
      warning(sprintf("Author paper ID: %s has citing paper IDs with NA values. These have been filtered out.", author_paper_id))
    }
    
    # Skip processing if no valid citing paper IDs remain
    if (length(valid_citing_paper_ids) == 0) {
      cat(sprintf("No valid citing papers remain for author paper ID: %s. Skipping.\n", author_paper_id))
      next
    }
    
    cat(sprintf("Processing author paper ID: %s\n", author_paper_id))
    
    paper_details <- list()  # Use list to gather all data
    
    # Process the citing papers in batches
    for (start_index in seq(1, length(valid_citing_paper_ids), by = batch_size)) {
      end_index <- min(start_index + batch_size - 1, length(valid_citing_paper_ids))
      current_batch <- valid_citing_paper_ids[start_index:end_index]
      
      cat(sprintf("  Processing batch from %d to %d\n", start_index, end_index))
      
      # Determine if it's a batch or single paper request
      if (length(current_batch) == 1) {
        paper_id <- current_batch[1]
        url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", paper_id, "?fields=", fields)
        response <- perform_request_with_apikey(url, api_key)
      } else {
        # Batch request with retry mechanism
        response <- NULL
        retries <- 0
        max_retries <- 5
        initial_backoff_time <- 1.5
        backoff_time <- initial_backoff_time
        last_request_time <- Sys.time()
        
        repeat {
          # Check and enforce rate limit
          time_since_last_request <- as.numeric(difftime(Sys.time(), last_request_time, units = "secs"))
          if (time_since_last_request < backoff_time) {
            Sys.sleep(backoff_time - time_since_last_request)
          }
          
          # Perform the batch request
          response <- perform_batch_request_with_apikey(api_key, current_batch, fields)
          
          if (!is.null(response)) {
            backoff_time <- initial_backoff_time  # Reset backoff time after success
            break
          } else if (retries < max_retries) {
            cat("    Retry due to failure...\n")
            retries <- retries + 1
            backoff_time <- backoff_time * 2  # Exponential backoff
          } else {
            cat("    Max retries reached, skipping this batch.\n")
            break
          }
          
          # Update last request time
          last_request_time <- Sys.time()
        }
      }
      
      if (!is.null(response)) {
        response_data <- tryCatch({
          fromJSON(response, flatten = TRUE)
        }, error = function(e) {
          cat("    Error parsing JSON: ", e$message, "\n")
          return(NULL)
        })
        
        if (!is.null(response_data)) {
          if (is.data.frame(response_data)) {
            # Batch response
            for (i in 1:nrow(response_data)) {
              paper_details[[length(paper_details) + 1]] <- as.list(response_data[i, ])
            }
          } else if (is.list(response_data)) {
            # Single paper response
            paper_details[[length(paper_details) + 1]] <- response_data
          } else {
            cat("    Unexpected data structure in response.\n")
          }
        } else {
          cat("    Failed to retrieve or parse data for this batch.\n")
        }
      }
      
      cat(sprintf("  Finished batch from %d to %d\n", start_index, end_index))
    }
    
    # Store structured list in the main list with the author_paper_id as the key
    citing_papers_details[[author_paper_id]] <- paper_details
    cat("Completed processing for author paper ID:", author_paper_id, "\n")
  }
  
  return(citing_papers_details)
}

## get the batch search to work
citing_paper_details_batch <- citing_paper_detail_batch(citing_papers, api_key)
saveRDS(citing_paper_details_batch, file='citing_paper_details_batch.RDS')

## data cleaning -- merging duplicate records
identify_duplicated_papers <- function(papers, citing_paper_details_batch) {
  # Step 1: Identify duplicated titles in the 'papers' data frame
  duplicated_titles <- unique(papers$title[duplicated(papers$title)])
  
  # Initialize a list to store the results
  duplicated_info <- list()
  
  # Step 2: For each duplicated title, find the corresponding paperIds
  for (dup_title in duplicated_titles) {
    # Get all paperIds with the duplicated title
    paper_ids <- papers$paperId[papers$title == dup_title]
    
    # Step 3: Match these paperIds with the names in citing_paper_details_batch
    matching_indices <- which(names(citing_paper_details_batch) %in% paper_ids)
    
    # Step 4: Store the title, indices, and paperIds if duplicates are found
    if (length(matching_indices) > 1) {  # Only interested if there's more than one matching entry
      duplicated_info[[dup_title]] <- list(
        indices = matching_indices,
        paperIds = paper_ids
      )
    }
  }
  
  return(duplicated_info)
}
# usage:
duplicated_papers_info <- identify_duplicated_papers(papers, citing_paper_details_batch)

#merging duplicated papers (papers that have the same title) in the database
merge_duplicated_papers <- function(citing_paper_details_batch, duplicated_papers_info) {
  for (title in names(duplicated_papers_info)) {
    cat(sprintf("\nProcessing duplicates for title: '%s'\n", title))
    paper_ids <- duplicated_papers_info[[title]]$paperIds
    cat(sprintf("Paper IDs: %s\n", paste(paper_ids, collapse = ", ")))
    
    # Initialize a list to collect all citing papers (including potential duplicates)
    all_citing_papers <- list()
    
    # Loop through each paper ID associated with the duplicate title
    for (paper_id in paper_ids) {
      if (!is.null(citing_paper_details_batch[[paper_id]])) {
        cat(sprintf("Processing entry with paper ID: %s\n", paper_id))
        
        # Add all citing papers to the list (including duplicates)
        all_citing_papers <- c(all_citing_papers, citing_paper_details_batch[[paper_id]])
        cat(sprintf("Added %d citing papers from paper ID: %s\n", length(citing_paper_details_batch[[paper_id]]), paper_id))
      } else {
        cat(sprintf("Warning: paperId %s not found in citing_paper_details_batch.\n", paper_id))
      }
    }
    
    # Remove duplicates based on citing paperId, ensuring unique representation
    unique_citing_papers <- unique(all_citing_papers, by = "paperId")
    cat(sprintf("Total citing papers after deduplication for title '%s': %d\n", title, length(unique_citing_papers)))
    
    # Store the unique citing papers in the merged paper details
    merged_paper_details <- unique_citing_papers
    
    # Replace the original entries in citing_paper_details_batch with the merged result
    merged_paper_id <- paper_ids[1]  # Keep the first paper ID as the key for the merged entry
    citing_paper_details_batch[[merged_paper_id]] <- merged_paper_details
    
    # Remove the other duplicate paper IDs from the batch
    to_remove <- setdiff(paper_ids, merged_paper_id)
    citing_paper_details_batch <- citing_paper_details_batch[!names(citing_paper_details_batch) %in% to_remove]
    cat(sprintf("Merged and cleaned entries under Paper ID: %s\n", merged_paper_id))
  }
  
  return(citing_paper_details_batch)
}
citing_paper_details_batch_cleaned <- merge_duplicated_papers(citing_paper_details_batch, duplicated_papers_info) 

sum(unlist(lapply(citing_paper_details_batch_cleaned, function(paper_list) length(paper_list))))
sum(unlist(lapply(citing_paper_details_batch, function(paper_list) length(paper_list))))

tmp<-unname(unlist(lapply(citing_paper_details_batch_cleaned, function(paper_list) {
  sapply(paper_list, function(detail) detail$paperId)  # Directly return the paperId ensuring no modification
})))
length(tmp)

## Retrieve second-degree citations with progress indication
second_degree_citations <- function(citing_paper_details_batch, api_key, batch_size = 500, limit = 1000, max_retries = 20) {
  # Initialize a list to store the second-degree citation details
  second_degree_citing_paper_details <- list()
  total_first_degree_papers <- length(citing_paper_details_batch)
  processed_first_degree_papers <- 0
  total_citing_papers <- 0
  
  # First pass: Calculate the total number of second-degree citations, excluding NAs
  for (first_degree_paper_id in names(citing_paper_details_batch)) {
    first_degree_citing_papers <- citing_paper_details_batch[[first_degree_paper_id]]
    
    for (citing_paper in first_degree_citing_papers) {
      if (!is.na(citing_paper$paperId)) {
        total_citing_papers <- total_citing_papers + 1
        # Initialize placeholders for all first-degree citations with valid IDs
        second_degree_citing_paper_details[[citing_paper$paperId]] <- list() 
      }
    }
  }
  
  cat(sprintf("Total number of second-degree citations to process: %d\n", total_citing_papers))
  Sys.sleep(5)
  return(second_degree_citing_paper_details)
  
  # Second pass: Process each first-degree paper and retrieve second-degree citations
  for (first_degree_paper_id in names(citing_paper_details_batch)) {
    first_degree_citing_papers <- citing_paper_details_batch[[first_degree_paper_id]]
    
    for (citing_paper in first_degree_citing_papers) {
      citing_paper_id <- citing_paper$paperId
      
      # Skip NA paper IDs
      if (is.na(citing_paper_id)) {
        next
      }
      
      # Ensure the correct entry is being modified
      if (!exists(citing_paper_id, where = second_degree_citing_paper_details)) {
        stop(paste("Mismatch in paper ID:", citing_paper_id, " - This ID is not initialized in the results list."))
      }
      
      # Attempt to retrieve second-degree citations for the citing paper
      second_degree_ids <- tryCatch({
        get_all_citing_paper_ids(data.frame(paperId = citing_paper_id), api_key, limit, max_retries)
      }, error = function(e) {
        stop("Error in get_citing_paper_ids: ", e$message)  # Stop function on error
      })
      
      # Handle case where no citations are found
      if (is.null(second_degree_ids) || length(second_degree_ids[[citing_paper_id]]) == 0) {
        cat(sprintf("No citations found for paper ID: %s\n", citing_paper_id))
        second_degree_citing_paper_details[[citing_paper_id]] <- list()  # Store empty list if no citations are found
        next
      }
      
      if (length(second_degree_ids[[citing_paper_id]]) > 0) {
        paper_details <- list()
        
        # Filter out NA second-degree IDs before processing
        valid_second_degree_ids <- second_degree_ids[[citing_paper_id]][!is.na(second_degree_ids[[citing_paper_id]])]
        
        for (start_index in seq(1, length(valid_second_degree_ids), by = batch_size)) {
          end_index <- min(start_index + batch_size - 1, length(valid_second_degree_ids))
          current_batch <- valid_second_degree_ids[start_index:end_index]
          
          response <- NULL
          retries <- 0
          last_request_time <- Sys.time()
          
          repeat {
            time_since_last_request <- as.numeric(difftime(Sys.time(), last_request_time, units = "secs"))
            if (time_since_last_request < 1) {
              Sys.sleep(1 - time_since_last_request)
            }
            
            if (length(current_batch) == 1) {
              paper_id <- current_batch[1]
              url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", paper_id, "?fields=paperId,title,venue,publicationVenue,year,authors,citationCount")
              response <- tryCatch({
                suppressMessages(perform_request_with_apikey(url, api_key))
              }, error = function(e) {
                cat("Error during GET request for paper ID:", paper_id, "\n")
                return(NULL)
              })
            } else {
              response <- tryCatch({
                suppressMessages(perform_batch_request_with_apikey(api_key, current_batch, "paperId,title,venue,publicationVenue,year,authors,citationCount"))
              }, error = function(e) {
                cat("Error during POST request for batch of paper IDs\n")
                return(NULL)
              })
            }
            
            if (!is.null(response)) {
              break
            } else if (retries >= max_retries) {
              stop("Maximum retries reached, exiting.")  # Stop if retries exceed the limit
            } else {
              retries <- retries + 1
              Sys.sleep(1)  # Additional sleep before retry
            }
            
            last_request_time <- Sys.time()
          }
          
          if (!is.null(response)) {
            response_data <- tryCatch({
              fromJSON(response, flatten = TRUE)
            }, error = function(e) {
              cat("Error parsing JSON response:", e$message, "\n")
              return(NULL)
            })
            
            if (!is.null(response_data)) {
              if (is.data.frame(response_data)) {
                for (i in 1:nrow(response_data)) {
                  paper_details[[length(paper_details) + 1]] <- as.list(response_data[i, ])
                }
              } else if (is.list(response_data)) {
                paper_details[[length(paper_details) + 1]] <- response_data
              }
            }
          }
        }
        
        second_degree_citing_paper_details[[citing_paper_id]] <- paper_details
      }
    }
    
    processed_first_degree_papers <- processed_first_degree_papers + 1
    progress <- (processed_first_degree_papers / total_first_degree_papers) * 100
    cat(sprintf("Progress: %.2f%% complete\n", progress))
  }
  
  cat("Processing complete.\n")
  return(second_degree_citing_paper_details)
}
##fixed to properly store multiple linkages
second_degree_citations <- function(citing_paper_details_batch, api_key, batch_size = 500, limit = 1000, max_retries = 20) {
  # Initialize a list to store the second-degree citation details
  second_degree_citing_paper_details <- list()
  
  # Prepare top-level structure with the same names as the input object
  for (first_degree_paper_id in names(citing_paper_details_batch)) {
    second_degree_citing_paper_details[[first_degree_paper_id]] <- list()
  }
  
  total_first_degree_papers <- length(citing_paper_details_batch)
  processed_first_degree_papers <- 0
  total_citing_papers <- 0
  
  # First pass: Calculate the total number of second-degree citations, excluding NAs
  for (first_degree_paper_id in names(citing_paper_details_batch)) {
    first_degree_citing_papers <- citing_paper_details_batch[[first_degree_paper_id]]
    
    for (citing_paper in first_degree_citing_papers) {
      if (!is.na(citing_paper$paperId)) {
        total_citing_papers <- total_citing_papers + 1
        # Initialize placeholders for each first-degree citation with valid IDs
        second_degree_citing_paper_details[[first_degree_paper_id]][[citing_paper$paperId]] <- list()
      }
    }
  }
  
  cat(sprintf("Total number of second-degree citations to process: %d\n", total_citing_papers))
  Sys.sleep(5)
  
  # Second pass: Process each first-degree paper and retrieve second-degree citations
  for (first_degree_paper_id in names(citing_paper_details_batch)) {
    first_degree_citing_papers <- citing_paper_details_batch[[first_degree_paper_id]]
    
    for (citing_paper in first_degree_citing_papers) {
      citing_paper_id <- citing_paper$paperId
      
      # Skip NA paper IDs
      if (is.na(citing_paper_id)) {
        next
      }
      
      # Ensure the correct entry is being modified
      if (!exists(citing_paper_id, where = second_degree_citing_paper_details[[first_degree_paper_id]])) {
        stop(paste("Mismatch in paper ID:", citing_paper_id, " - This ID is not initialized in the results list under", first_degree_paper_id))
      }
      
      # Attempt to retrieve second-degree citations for the citing paper
      second_degree_ids <- tryCatch({
        get_all_citing_paper_ids(data.frame(paperId = citing_paper_id), api_key, limit, max_retries)
      }, error = function(e) {
        stop("Error in get_all_citing_paper_ids: ", e$message)  # Stop function on error
      })
      
      # Handle case where no citations are found
      if (is.null(second_degree_ids) || length(second_degree_ids[[citing_paper_id]]) == 0) {
        cat(sprintf("No citations found for paper ID: %s\n", citing_paper_id))
        second_degree_citing_paper_details[[first_degree_paper_id]][[citing_paper_id]] <- list()  # Store empty list if no citations are found
        next
      }
      
      if (length(second_degree_ids[[citing_paper_id]]) > 0) {
        paper_details <- list()
        
        # Filter out NA second-degree IDs before processing
        valid_second_degree_ids <- second_degree_ids[[citing_paper_id]][!is.na(second_degree_ids[[citing_paper_id]])]
        
        for (start_index in seq(1, length(valid_second_degree_ids), by = batch_size)) {
          end_index <- min(start_index + batch_size - 1, length(valid_second_degree_ids))
          current_batch <- valid_second_degree_ids[start_index:end_index]
          
          response <- NULL
          retries <- 0
          last_request_time <- Sys.time()
          
          repeat {
            time_since_last_request <- as.numeric(difftime(Sys.time(), last_request_time, units = "secs"))
            if (time_since_last_request < 1) {
              Sys.sleep(1 - time_since_last_request)
            }
            
            if (length(current_batch) == 1) {
              paper_id <- current_batch[1]
              url <- paste0("https://api.semanticscholar.org/graph/v1/paper/", paper_id, "?fields=paperId,title,venue,publicationVenue,year,authors,citationCount")
              response <- tryCatch({
                suppressMessages(perform_request_with_apikey(url, api_key))
              }, error = function(e) {
                cat("Error during GET request for paper ID:", paper_id, "\n")
                return(NULL)
              })
            } else {
              response <- tryCatch({
                suppressMessages(perform_batch_request_with_apikey(api_key, current_batch, "paperId,title,venue,publicationVenue,year,authors,citationCount"))
              }, error = function(e) {
                cat("Error during POST request for batch of paper IDs\n")
                return(NULL)
              })
            }
            
            if (!is.null(response)) {
              break
            } else if (retries >= max_retries) {
              stop("Maximum retries reached, exiting.")  # Stop if retries exceed the limit
            } else {
              retries <- retries + 1
              Sys.sleep(1)  # Additional sleep before retry
            }
            
            last_request_time <- Sys.time()
          }
          
          if (!is.null(response)) {
            response_data <- tryCatch({
              fromJSON(response, flatten = TRUE)
            }, error = function(e) {
              cat("Error parsing JSON response:", e$message, "\n")
              return(NULL)
            })
            
            if (!is.null(response_data)) {
              if (is.data.frame(response_data)) {
                for (i in 1:nrow(response_data)) {
                  paper_details[[length(paper_details) + 1]] <- as.list(response_data[i, ])
                }
              } else if (is.list(response_data)) {
                paper_details[[length(paper_details) + 1]] <- response_data
              }
            }
          }
        }
        
        # Store the second-degree citation details under the correct first-degree citation
        second_degree_citing_paper_details[[first_degree_paper_id]][[citing_paper_id]] <- paper_details
      }
    }
    
    processed_first_degree_papers <- processed_first_degree_papers + 1
    progress <- (processed_first_degree_papers / total_first_degree_papers) * 100
    cat(sprintf("Progress: %.2f%% complete\n", progress))
  }
  
  cat("Processing complete.\n")
  return(second_degree_citing_paper_details)
}
second_degree_citing_paper_details_batch <- second_degree_citations(citing_paper_details_batch_cleaned, api_key)

saveRDS(second_degree_citing_paper_details_batch, file='second_degree_citing_paper_details_batch.RDS')
second_degree_citing_paper_details_batch <- readRDS(file='second_degree_citing_paper_details_batch.RDS')

infer_citation_network <- function(citation_data) {
  edges <- list()  # List to store edges as pairs of (source, target)
  total_edges <- 0 # Counter for total number of edges
  
  cat("Starting network inference...\n")
  cat(sprintf("Processing %d top-level papers (author's papers)...\n", length(citation_data)))
  
  # Iterate over the top-level papers (author's papers)
  for (author_paper_id in names(citation_data)) {
    first_degree_citations <- citation_data[[author_paper_id]]
    
    cat(sprintf("Processing author paper: %s with %d first-degree citations...\n", author_paper_id, length(first_degree_citations)))
    
    # Validate that the author's paper ID is not missing
    if (is.null(author_paper_id) || author_paper_id == "") {
      warning(sprintf("Warning: Author's paper ID is missing or invalid: %s", author_paper_id))
      next
    }
    
    # Iterate over first-degree citations
    for (first_degree_paper_id in names(first_degree_citations)) {
      # Validate the first-degree paper ID
      if (is.null(first_degree_paper_id) || first_degree_paper_id == "") {
        warning(sprintf("  Warning: First-degree paper ID is missing or invalid for author paper: %s", author_paper_id))
        next
      }
      
      cat(sprintf("  Adding edge: %s -> %s (author paper -> first-degree citation)\n", author_paper_id, first_degree_paper_id))
      # Create an edge from the author's paper to the first-degree citation
      edges <- append(edges, list(c(author_paper_id, first_degree_paper_id)))
      total_edges <- total_edges + 1
      
      second_degree_citations <- first_degree_citations[[first_degree_paper_id]]
      
      # Check the number of second-degree citations
      num_second_degree_citations <- length(second_degree_citations)
      cat(sprintf("    Processing %d second-degree citations for first-degree paper: %s...\n", num_second_degree_citations, first_degree_paper_id))
      
      # Iterate over second-degree citations
      for (second_degree_citation in second_degree_citations) {
        # Validate the second-degree citation structure and paper ID
        if (!is.null(second_degree_citation$paperId) && second_degree_citation$paperId != "") {
          cat(sprintf("      Adding edge: %s -> %s (first-degree citation -> second-degree citation)\n", first_degree_paper_id, second_degree_citation$paperId))
          # Create an edge from the first-degree citation to the second-degree citation
          edges <- append(edges, list(c(first_degree_paper_id, second_degree_citation$paperId)))
          total_edges <- total_edges + 1
        } else {
          warning(sprintf("      Warning: Second-degree paper ID is missing or invalid for first-degree paper: %s", first_degree_paper_id))
          cat("      Skipped adding edge due to missing or invalid second-degree paperId.\n")
        }
      }
    }
  }
  
  # Convert the list of edges to a matrix
  if (length(edges) == 0) {
    stop("Error: No valid edges were created. The citation data may be empty or incorrectly structured.")
  }
  
  edge_matrix <- do.call(rbind, edges)
  cat(sprintf("Total edges added: %d\n", total_edges))
  
  # Create an igraph object from the edge list
  citation_network <- tryCatch({
    graph_from_edgelist(edge_matrix, directed = TRUE)
  }, error = function(e) {
    stop("Error in creating igraph object: ", e$message)
  })
  
  cat("Network inference complete.\n")
  return(citation_network)
}
tmp<-infer_citation_network(second_degree_citing_paper_details_batch)

infer_citation_network_layers <- function(citation_data) {
  edges <- list()  # List to store edges as pairs of (source, target)
  layer1_df <- data.frame(ID = character(), Layer = integer())  # For Layer 1
  layer2_df <- data.frame(ID = character(), Layer = integer())  # For Layer 2
  layer3_df <- data.frame(ID = character(), Layer = integer())  # For Layer 3
  total_edges <- 0  # Counter for total number of edges
  
  cat("Starting network inference...\n")
  
  # Iterate over the top-level papers (author's papers) - Layer 1
  for (author_paper_id in names(citation_data)) {
    first_degree_citations <- citation_data[[author_paper_id]]
    
    # Assign to Layer 1 (Author's papers)
    layer1_df <- rbind(layer1_df, data.frame(ID = author_paper_id, Layer = 1))
    
    # Iterate over first-degree citations - Layer 2
    for (first_degree_paper_id in names(first_degree_citations)) {
      if (is.null(first_degree_paper_id) || first_degree_paper_id == "") {
        warning(sprintf("  Warning: First-degree paper ID is missing or invalid for author paper: %s", author_paper_id))
        next
      }
      
      # Create edge and assign to Layer 2 (First-degree citations)
      edges <- append(edges, list(c(author_paper_id, first_degree_paper_id)))
      total_edges <- total_edges + 1
      layer2_df <- rbind(layer2_df, data.frame(ID = first_degree_paper_id, Layer = 2))
      
      # Iterate over second-degree citations - Layer 3
      second_degree_citations <- first_degree_citations[[first_degree_paper_id]]
      for (second_degree_citation in second_degree_citations) {
        if (!is.null(second_degree_citation$paperId) && second_degree_citation$paperId != "") {
          # Create edge and assign to Layer 3 (Second-degree citations)
          edges <- append(edges, list(c(first_degree_paper_id, second_degree_citation$paperId)))
          total_edges <- total_edges + 1
          layer3_df <- rbind(layer3_df, data.frame(ID = second_degree_citation$paperId, Layer = 3))
        } else {
          warning(sprintf("      Warning: Second-degree paper ID is missing or invalid for first-degree paper: %s", first_degree_paper_id))
        }
      }
    }
  }
  
  # Combine all layer data frames
  v_layers_df <- unique(rbind(layer1_df, layer2_df, layer3_df))
  v_layers <- setNames(v_layers_df$Layer, v_layers_df$ID)
  
  if (length(edges) == 0) {
    stop("Error: No valid edges were created. The citation data may be empty or incorrectly structured.")
  }
  
  edge_matrix <- do.call(rbind, edges)
  cat(sprintf("Total edges added: %d\n", total_edges))
  
  citation_network <- tryCatch({
    graph_from_edgelist(edge_matrix, directed = TRUE)
  }, error = function(e) {
    stop("Error in creating igraph object: ", e$message)
  })
  
  # Assign the layer attribute to each vertex using the combined data frame
  V(citation_network)$layer <- v_layers[V(citation_network)$name]
  
  # Diagnostic Information
  cat("=== Layer Assignment Summary ===\n")
  cat(sprintf("Layer 1 (Author's Papers): %d vertices\n", nrow(layer1_df)))
  cat(sprintf("Layer 2 (First-Degree Citations): %d vertices\n", nrow(layer2_df)))
  cat(sprintf("Layer 3 (Second-Degree Citations): %d vertices\n", nrow(layer3_df)))
  cat(sprintf("Total vertices in graph: %d\n", length(V(citation_network))))
  
  cat("Network inference complete.\n")
  return(citation_network)
}
tmp<-infer_citation_network_layers(second_degree_citing_paper_details_batch)


plot_layers <- function(g) {
  # Get the counts of vertices in each layer
  layer_counts <- table(V(g)$layer)
  
  # Calculate base sizes inversely proportional to the square root of the number of nodes in each layer
  max_size <- 20  # Adjust this to control overall vertex size scaling
  layer_sizes <- max_size / sqrt(layer_counts)
  
  # Assign sizes to vertices based on their layer
  V(g)$size <- layer_sizes[V(g)$layer]
  
  # Define colors for each layer
  vertex_colors <- c("red", "green", "blue")
  V(g)$color <- vertex_colors[V(g)$layer]
  
  # Apply the Fruchterman-Reingold layout
  layout <- layout_with_fr(g, niter = 1000, start.temp = sqrt(vcount(g)), grid = "auto")
  
  # Optional: Scale the layout to adjust the spacing
  layout <- layout * 1.5  # You can adjust this factor for more or less spacing
  
  # Plot the graph using the custom layout
  plot(g, layout = layout, vertex.color = V(g)$color, vertex.size = V(g)$size,
       vertex.label = NA, main = "Layer Visualization with Fruchterman-Reingold Layout")
}
# Calling the function to plot layers if running interactively
if(interactive()) {
  plot_layers(tmp)
}


plot_tripartite_graph <- function(g) {
  # Custom layout function similar to the one from StackOverflow
  layout_k_partite <- function(g) {
    l <- layout_with_sugiyama(g)$layout[, 2:1]  # Perform Sugiyama layout and swap axes
    l[, 1] <- V(g)$layer * 200  # Set x-coordinates based on layer
    
    # Evenly space y-coordinates within each layer
    for (layer in unique(V(g)$layer)) {
      nodes_in_layer <- which(V(g)$layer == layer)
      l[nodes_in_layer, 2] <- seq(from = 1, to = -1, length.out = length(nodes_in_layer))
    }
    
    return(l)
  }
  
  # Define colors for each layer
  vertex_colors <- c("red", "green", "blue")
  
  # Set vertex colors based on the layer attribute
  V(g)$color <- vertex_colors[V(g)$layer]
  
  # Plot the graph using the custom layout without text labels
  plot(g, layout = layout_k_partite(g), vertex.size = 3, vertex.label = NA,
       vertex.color = V(g)$color, edge.arrow.size = 0.2, edge.curved = 0.1,
       rescale = TRUE, asp = 0)
}
plot_tripartite_graph(tmp)


plot_tripartite_graph <- function(g, max_edge_width = 1, min_edge_width = 0.01, vertex_border_width = 0.001) {
  # Custom layout function similar to the one from StackOverflow
  layout_k_partite <- function(g) {
    l <- layout_with_sugiyama(g)$layout[, 2:1]  # Perform Sugiyama layout and swap axes
    l[, 1] <- V(g)$layer * 200  # Set x-coordinates based on layer
    
    # Evenly space y-coordinates within each layer
    for (layer in unique(V(g)$layer)) {
      nodes_in_layer <- which(V(g)$layer == layer)
      l[nodes_in_layer, 2] <- seq(from = 1, to = -1, length.out = length(nodes_in_layer))
    }
    
    return(l)
  }
  
  # Define colors for each layer
  vertex_colors <- c("red", "green", "blue")
  
  # Set vertex colors based on the layer attribute
  V(g)$color <- vertex_colors[V(g)$layer]
  
  # Calculate vertex sizes inversely proportional to the number of vertices in each layer
  layer_counts <- table(V(g)$layer)
  max_size <- 40  # You can adjust this maximum size as needed
  V(g)$size <- max_size / sqrt(layer_counts[V(g)$layer])
  
  # Calculate edge widths inversely proportional to the number of incomming edges for each vertex
  degree_out <- degree(g, mode = "in")  # Get the out-degree (number of outgoing edges)
  
  # Use the correct method to get the starting vertices of edges
  edge_from <- ends(g, E(g), names = FALSE)[, 1]
  raw_edge_widths <- 1 / (degree_out[edge_from] + 1)  # Avoid division by zero
  
  # Check if there are valid edge widths to normalize
  if (length(raw_edge_widths) > 0 && max(raw_edge_widths) > 0) {
    # Normalize edge widths and enforce minimum edge width
    E(g)$width <- pmax(min_edge_width, max_edge_width * (raw_edge_widths / max(raw_edge_widths)))
  } else {
    E(g)$width <- min_edge_width  # Fallback value for edge width if something goes wrong
  }
  
  # Plot the graph using the custom layout without text labels
  plot(g, layout = layout_k_partite(g), vertex.size = V(g)$size, vertex.label = NA,
       vertex.color = V(g)$color, edge.width = E(g)$width, edge.arrow.size = 0.2, edge.curved = 0.1,
       vertex.frame.width = vertex_border_width,  # Set the vertex border width
       rescale = TRUE, asp = 0)
}
# Call the function to plot the graph with a user-defined maximum edge width and vertex border width
plot_tripartite_graph(tmp)  # Example with max edge width and vertex border width both set to 2



plot_tripartite_graph <- function(g, max_edge_width = 1, min_edge_width = 0.01, vertex_border_width = 0.001) {
  # Custom layout function similar to the one from StackOverflow
  layout_k_partite <- function(g) {
    l <- layout_with_sugiyama(g)$layout[, 2:1]  # Perform Sugiyama layout and swap axes
    l[, 1] <- V(g)$layer * 200  # Set x-coordinates based on layer
    
    # Sort and evenly space y-coordinates within each layer
    for (layer in unique(V(g)$layer)) {
      nodes_in_layer <- which(V(g)$layer == layer)
      
      if (layer == 1) {
        # Sort Layer 1 vertices by the number of first-degree citations (incoming edges from Layer 2)
        citations_count <- degree(g, v = nodes_in_layer, mode = "total")
      } else if (layer == 2) {
        # Sort Layer 2 vertices by the number of second-degree citations (incoming edges from Layer 3)
        citations_count <- degree(g, v = nodes_in_layer, mode = "total")
      } else {
        # For Layer 3, order normally (or use Sugiyama to minimize crossings)
        citations_count <- degree(g, v = nodes_in_layer, mode = "total")
      }
      
      # Order nodes by descending citation count
      ordered_nodes <- nodes_in_layer[order(citations_count, decreasing = TRUE)]
      
      # Space out nodes vertically in the ordered sequence
      l[ordered_nodes, 2] <- seq(from = 1, to = -1, length.out = length(nodes_in_layer))
    }
    
    return(l)
  }
  
  # Define colors for each layer
  vertex_colors <- c("red", "green", "blue")
  
  # Set vertex colors based on the layer attribute
  V(g)$color <- vertex_colors[V(g)$layer]
  
  # Calculate vertex sizes inversely proportional to the number of vertices in each layer
  layer_counts <- table(V(g)$layer)
  max_size <- 40  # You can adjust this maximum size as needed
  V(g)$size <- max_size / sqrt(layer_counts[V(g)$layer])
  
  # Calculate edge widths inversely proportional to the number of incoming edges for each vertex
  degree_in <- degree(g, mode = "in")  # Get the in-degree (number of incoming edges)
  
  # Use the correct method to get the starting vertices of edges
  edge_from <- ends(g, E(g), names = FALSE)[, 1]
  raw_edge_widths <- 1 / (degree_in[edge_from] + 1)  # Avoid division by zero
  
  # Normalize edge widths and enforce minimum edge width
  if (length(raw_edge_widths) > 0 && max(raw_edge_widths) > 0) {
    E(g)$width <- pmax(min_edge_width, max_edge_width * (raw_edge_widths / max(raw_edge_widths)))
  } else {
    E(g)$width <- min_edge_width  # Fallback value for edge width if something goes wrong
  }
  
  # Plot the graph using the custom layout without text labels
  plot(g, layout = layout_k_partite(g), vertex.size = V(g)$size, vertex.label = NA,
       vertex.color = V(g)$color, edge.width = E(g)$width, edge.arrow.size = 0.2, edge.curved = 0.1,
       vertex.frame.width = vertex_border_width,  # Set the vertex border width
       rescale = TRUE, asp = 0)
}
plot_tripartite_graph(tmp)  # Example with max edge width and vertex border width both set to 2




{
  # Compute the degree of each vertex
  degree_distribution <- degree(tmp)
  
  # Summary of the degree distribution
  summary(degree_distribution)
  
  plot_degree_distribution <- function(g) {
    degrees <- degree(g)
    
    # Plot Histogram
    hist(degrees, breaks = 50, main = "Degree Distribution",
         xlab = "Degree", ylab = "Frequency", col = "lightblue")
    
    # Calculate the frequency of each degree
    degree_freq <- table(degrees)
    
    # Convert to a data frame for easier manipulation
    degree_freq_df <- as.data.frame(degree_freq)
    
    # Remove zero frequencies and ensure all values are finite
    degree_freq_df <- degree_freq_df[degree_freq_df$Freq > 0, ]
    
    # Check for and remove any non-finite values
    degree_freq_df <- degree_freq_df[is.finite(degree_freq_df$Freq) & is.finite(degree_freq_df$degrees), ]
    
    # Plot Log-Log Degree Distribution
    plot(degree_freq_df$degrees, degree_freq_df$Freq, log = "xy", col = "blue", pch = 20,
         main = "Log-Log Degree Distribution",
         xlab = "Degree", ylab = "Frequency")
  }

  plot_graph_with_degree <- function(g) {
    degrees <- degree(g)
    
    # Scale the size of the vertices based on degree
    V(g)$size <- sqrt(degrees) * 2  # Adjust the scaling factor as needed
    
    # Plot the graph
    plot(g, vertex.color = "skyblue", vertex.label = NA,
         edge.arrow.size = 0.2, main = "Graph Visualization with Degree-Based Node Size")
  }
  
  # Call the functions
  plot_degree_distribution(tmp)
  plot_graph_with_degree(tmp)
  
  plot_layers_highlighted_fast <- function(g) {
    # Define colors for each layer
    vertex_colors <- c("red", "green", "blue")  # Customize these colors
    V(g)$color <- vertex_colors[V(g)$layer]
    
    # Assign vertex sizes based on layers (for better distinction)
    layer_sizes <- c(10, 7, 5)  # Larger sizes for lower layers, smaller for higher layers
    V(g)$size <- layer_sizes[V(g)$layer]
    
    # Precompute edge weights based on the layers they connect
    from_layer <- V(g)$layer[get.edge.attribute(g, "from")]
    to_layer <- V(g)$layer[get.edge.attribute(g, "to")]
    
    E(g)$weight <- ifelse(from_layer == 1 & to_layer == 2, 3, 
                          ifelse(from_layer == 2 & to_layer == 3, 1, 2))
    
    # Plot the graph using the Sugiyama layout
    plot(g, layout = layout_with_sugiyama(g)$layout,
         vertex.size = V(g)$size, vertex.label = NA, 
         edge.width = E(g)$weight, edge.arrow.size = 0.2,
         vertex.color = V(g)$color,
         main = "Hierarchical Layout (Sugiyama) with Highlighted Layers")
  }
  plot_layers_highlighted(tmp)
  
  

  
}


library(igraph)

plot_large_network <- function(citation_network, author_paper_ids) {
  cat("Starting to plot the network...\n")
  
  # Use the Fruchterman-Reingold layout for fast and evenly spread out edges
  layout <- layout_with_fr(citation_network, niter = 5000)
  
  # Predefined choices for author paper nodes
  author_node_color <- "red"
  author_node_size <- 2
  
  # Predefined choices for other nodes
  other_node_color <- "lightblue"
  other_node_size <- 0.5
  
  # Predefined choices for thinner node borders
  vertex_frame_width <- 0.1  # Very thin border
  vertex_frame_color <- "black"  # Keep borders black
  
  # Internal argument for edge width
  edge_width <- 0.5  # Adjust this value to control edge thickness
  
  # Create a vector to determine vertex colors
  vertex_colors <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_color, other_node_color)
  
  # Create a vector to determine vertex sizes
  vertex_sizes <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_size, other_node_size)
  
  # Plot the network with highlighted author's papers, thinner borders, and custom edge width
  plot(citation_network, layout = layout, vertex.size = vertex_sizes, vertex.label = NA,
       vertex.color = vertex_colors, vertex.frame.color = vertex_frame_color, vertex.frame.width = vertex_frame_width,
       edge.arrow.size = 0.2, edge.color = "black", edge.width = edge_width, 
       main = "Citation Network")
  
  cat("Plotting complete.\n")
}
plot_large_network <- function(citation_network, author_paper_ids) {
  cat("Starting to plot the network...\n")
  
  # Use the Fruchterman-Reingold layout with increased iterations and starting temperature for more spread-out nodes
  layout <- layout_with_fr(citation_network, niter = 10000, start.temp = sqrt(vcount(citation_network)) * 10)
  
  # Use the Fruchterman-Reingold layout with increased iterations and starting temperature for more spread-out nodes
  layout <- layout_with_fr(citation_network, niter = 10000, start.temp = sqrt(vcount(citation_network)) * 10)
  
  # Predefined choices for author paper nodes
  author_node_color <- "red"
  author_node_size <- 2
  
  # Predefined choices for other nodes
  other_node_color <- "lightblue"
  other_node_size <- 0.5
  
  # Predefined choices for thinner node borders
  vertex_frame_width <- 0.1  # Very thin border
  vertex_frame_color <- "black"  # Keep borders black
  
  # Internal argument for edge width
  edge_width <- 0.5  # Adjust this value to control edge thickness
  
  # Create a vector to determine vertex colors
  vertex_colors <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_color, other_node_color)
  
  # Create a vector to determine vertex sizes
  vertex_sizes <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_size, other_node_size)
  
  # Plot the network with highlighted author's papers, thinner borders, and custom edge width
  plot(citation_network, layout = layout, vertex.size = vertex_sizes, vertex.label = NA,
       vertex.color = vertex_colors, vertex.frame.color = vertex_frame_color, vertex.frame.width = vertex_frame_width,
       edge.arrow.size = 0.2, edge.color = "gray", edge.width = edge_width, 
       main = "Citation Network")
  
  cat("Plotting complete.\n")
}
plot_large_network(tmp, author_paper_ids = names(second_degree_citing_paper_details_batch))


plot_large_network_drl <- function(citation_network, author_paper_ids) {
  cat("Starting to plot the network using DrL layout with edge cutting...\n")
  
  # Use the DrL layout with customized options for more spread out nodes
  layout <- layout_with_drl(
    citation_network, 
    options = list(
      edge.cut = 1,  # Maximal edge cutting
      init.iterations = 1000,  # Increase iterations in the initial phase
      init.temperature = 10,  # Higher initial temperature for more movement
      liquid.iterations = 1000,  # Increase iterations in the liquid phase
      liquid.temperature = 10,  # Higher temperature to allow nodes to move freely
      expansion.iterations = 1000,  # Increase iterations in the expansion phase
      expansion.temperature = 10,  # Higher temperature for spreading out nodes
      cooldown.iterations = 1000,  # More iterations for the cooldown phase
      cooldown.temperature = 1,  # Gradual cooling to stabilize the layout
      crunch.iterations = 1000,  # Final fine-tuning
      simmer.iterations = 1000  # Simmer phase to refine the layout
    )
  )
  
  # Predefined choices for author paper nodes
  author_node_color <- "red"
  author_node_size <- 2
  
  # Predefined choices for other nodes
  other_node_color <- "lightblue"
  other_node_size <- 0.5
  
  # Predefined choices for thinner node borders
  vertex_frame_width <- 0.1  # Very thin border
  vertex_frame_color <- "black"  # Keep borders black
  
  # Internal argument for edge width
  edge_width <- 0.1  # Adjust this value to control edge thickness
  
  # Create a vector to determine vertex colors
  vertex_colors <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_color, other_node_color)
  
  # Create a vector to determine vertex sizes
  vertex_sizes <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_size, other_node_size)
  
  # Plot the network with highlighted author's papers, thinner borders, and custom edge width
  plot(citation_network, layout = layout, vertex.size = vertex_sizes, vertex.label = NA,
       vertex.color = vertex_colors, vertex.frame.color = vertex_frame_color, vertex.frame.width = vertex_frame_width,
       edge.arrow.size = 0.2, edge.color = "gray", edge.width = edge_width, 
       main = "Citation Network (DrL Layout with Edge Cutting)")
  
  cat("Plotting complete.\n")
}

plot_large_network_drl <- function(citation_network, author_paper_ids) {
  cat("Starting to plot the network using DrL layout with edge cutting...\n")
  
  # Use the DrL layout with optimized options for a reasonable processing time
  layout <- layout_with_drl(
    citation_network, 
    options = list(
      edge.cut = 1,  # Maximal edge cutting
      init.iterations = 300,  # Reduced iterations in the initial phase
      init.temperature = 5,  # Moderate initial temperature
      liquid.iterations = 300,  # Reduced iterations in the liquid phase
      liquid.temperature = 5,  # Moderate temperature
      expansion.iterations = 300,  # Reduced iterations in the expansion phase
      expansion.temperature = 5,  # Moderate temperature for spreading out nodes
      cooldown.iterations = 300,  # Reduced iterations for the cooldown phase
      cooldown.temperature = 1,  # Gradual cooling to stabilize the layout
      crunch.iterations = 300,  # Final fine-tuning with fewer iterations
      simmer.iterations = 300  # Simmer phase with fewer iterations
    )
  )
  
  # Predefined choices for author paper nodes
  author_node_color <- "red"
  author_node_size <- 2
  
  # Predefined choices for other nodes
  other_node_color <- "lightblue"
  other_node_size <- 0.5
  
  # Predefined choices for thinner node borders
  vertex_frame_width <- 0.1  # Very thin border
  vertex_frame_color <- "black"  # Keep borders black
  
  # Internal argument for edge width
  edge_width <- 0.1  # Adjust this value to control edge thickness
  
  # Create a vector to determine vertex colors
  vertex_colors <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_color, other_node_color)
  
  # Create a vector to determine vertex sizes
  vertex_sizes <- ifelse(V(citation_network)$name %in% author_paper_ids, author_node_size, other_node_size)
  
  # Plot the network with highlighted author's papers, thinner borders, and custom edge width
  plot(citation_network, layout = layout, vertex.size = vertex_sizes, vertex.label = NA,
       vertex.color = vertex_colors, vertex.frame.color = vertex_frame_color, vertex.frame.width = vertex_frame_width,
       edge.arrow.size = 0.2, edge.color = "gray", edge.width = edge_width, 
       main = "Citation Network (DrL Layout with Edge Cutting)")
  
  cat("Plotting complete.\n")
}
plot_large_network_drl(tmp, author_paper_ids = names(second_degree_citing_paper_details_batch))

plot(tmp, layout=layout_with_lgl)


{

  infer_citation_network <- function(citing_paper_details_batch) {
    # Initialize an empty data frame for edges
    edges <- data.frame(from = character(), to = character(), stringsAsFactors = FALSE)
    
    # Iterate over the list to build the edges data frame
    for (author_paper_id in names(citing_paper_details_batch)) {
      citing_papers <- citing_paper_details_batch[[author_paper_id]]
      
      # Extract citing paper IDs and corresponding author paper IDs
      citing_paper_edges <- data.frame(
        from = sapply(citing_papers, function(paper) paper$paperId),
        to = rep(author_paper_id, length(citing_papers)),
        stringsAsFactors = FALSE
      )
      
      # Append to the edges data frame
      edges <- rbind(edges, citing_paper_edges)
    }
    
    # Filter out rows with NA or empty values
    edges <- edges %>%
      filter(!is.na(from) & from != "" & !is.na(to) & to != "")
    
    # Create a directed graph from the edges data frame
    if (nrow(edges) > 0) {
      g <- graph_from_data_frame(edges, directed = TRUE)
      
      # Identify the vertices that correspond to the author's papers
      author_papers <- unique(edges$to)
      
      # Set vertex colors: author's papers in red, others in blue
      V(g)$color <- ifelse(V(g)$name %in% author_papers, "red", "lightblue")
      
      # Adjust node sizes based on degree (number of connections)
      V(g)$size <- log1p(degree(g)) * 3 + 2
      
      # Improve edge visibility by adjusting width and color
      E(g)$width <- 0.5
      E(g)$color <- adjustcolor("gray80", alpha.f = 0.5)
      
      # Add borders to nodes
      V(g)$frame.color <- "black"
      
      return(g)
    } else {
      cat("No valid edges found to create a citation network.\n")
      return(NULL)
    }
  }

  plot_citation_network <- function(g, layout_algo = "fr") {
    if (is.null(g)) {
      cat("The graph object is NULL. Cannot plot an empty graph.\n")
      return(NULL)
    }
    
    # Choose the layout algorithm
    layout <- switch(layout_algo,
                     "kk" = layout_with_kk(g), # Kamada-Kawai layout
                     "fr" = layout_with_fr(g, niter = 1000), # Fruchterman-Reingold layout
                     layout_with_kk(g)) # Default to Kamada-Kawai
    
    # Plot the graph
    plot(g, vertex.label = NA, 
         layout = layout, 
         main = "Paper Citation Network", 
         vertex.color = V(g)$color, 
         vertex.size = V(g)$size, 
         vertex.frame.color = V(g)$frame.color,
         edge.width = E(g)$width, 
         edge.color = E(g)$color,
         vertex.label.cex = 0.8, 
         vertex.label.color = "black",
         margin = 0.1)
    
    # Add a legend
    legend("bottomleft", legend = c("Author's paper", "Cited papers"), 
           col = c("red", "lightblue"), 
           pch = 21, 
           pt.bg = c("red", "lightblue"), 
           pt.cex = 1.5,
           bg = adjustcolor("white", alpha.f = 0.7))
  }
  
  # Step 2: Plot the static citation network
  network<-infer_citation_network(citing_paper_details_batch_cleaned)
  plot_citation_network(network, layout_algo = 'fr')
  
  
  library(visNetwork)
  plot_interactive_citation_network <- function(citation_graph) {
    
    # Extract edges and nodes
    edges <- get.data.frame(citation_graph, what = "edges")
    nodes <- data.frame(id = V(citation_graph)$name, label = V(citation_graph)$name, stringsAsFactors = FALSE)
    
    # Generate the interactive network visualization
    visNetwork(nodes, edges) %>%
      visIgraphLayout(layout = "layout_with_fr") %>%
      visEdges(arrows = "to") %>%
      visNodes(size = 15) %>%
      visOptions(highlightNearest = TRUE, nodesIdSelection = TRUE) %>%
      visInteraction(navigationButtons = TRUE)
  }
  plot_interactive_citation_network(network)
  
  
  #first and second degree citation network code
  library(igraph)
  library(dplyr)
  
  infer_combined_citation_network <- function(citing_paper_details_batch, second_degree_citing_paper_details_batch) {
    # Initialize an empty data frame for edges
    edges <- data.frame(from = character(), to = character(), stringsAsFactors = FALSE)
    
    # Process first-degree citations
    cat("Processing first-degree citations...\n")
    for (author_paper_id in names(citing_paper_details_batch)) {
      citing_papers <- citing_paper_details_batch[[author_paper_id]]
      
      # Loop through each citing paper
      for (citing_paper in citing_papers) {
        if (!is.null(citing_paper$paperId)) {
          edges <- rbind(edges, data.frame(from = citing_paper$paperId, to = author_paper_id, stringsAsFactors = FALSE))
          cat(sprintf("Added edge from %s to %s (first-degree)\n", citing_paper$paperId, author_paper_id))
        }
      }
    }
    
    # Process second-degree citations
    cat("Processing second-degree citations...\n")
    for (first_degree_paper_id in names(second_degree_citing_paper_details_batch)) {
      second_degree_citing_papers <- second_degree_citing_paper_details_batch[[first_degree_paper_id]]
      
      # Loop through each second-degree citing paper
      for (second_degree_citing_paper in second_degree_citing_papers) {
        if (!is.null(second_degree_citing_paper$paperId)) {
          edges <- rbind(edges, data.frame(from = second_degree_citing_paper$paperId, to = first_degree_paper_id, stringsAsFactors = FALSE))
          cat(sprintf("Added edge from %s to %s (second-degree)\n", second_degree_citing_paper$paperId, first_degree_paper_id))
        }
      }
    }
    
    # Clean up the edges to remove any potential NAs or blanks
    edges <- edges %>%
      filter(!is.na(from) & from != "" & !is.na(to) & to != "")
    
    cat(sprintf("Total edges processed: %d\n", nrow(edges)))
    
    return(edges)
  }
  
  # This function now returns a data frame of edges suitable for creating a graph externally.
  infer_combined_citation_network <- function(citing_paper_details_batch, second_degree_citing_paper_details_batch) {
    # Convert list to data.table for faster operations
    edges <- data.table(from = character(), to = character())
    
    # Process first-degree citations using rbindlist for efficiency
    cat("Processing first-degree citations...\n")
    first_degree_edges <- rbindlist(lapply(names(citing_paper_details_batch), function(author_paper_id) {
      citing_papers <- citing_paper_details_batch[[author_paper_id]]
      if (!is.null(citing_papers)) {
        data.table(
          from = sapply(citing_papers, function(paper) paper$paperId),
          to = author_paper_id
        )
      }
    }), fill = TRUE)
    
    # Process second-degree citations
    cat("Processing second-degree citations...\n")
    second_degree_edges <- rbindlist(lapply(names(second_degree_citing_paper_details_batch), function(first_degree_paper_id) {
      second_degree_citing_papers <- second_degree_citing_paper_details_batch[[first_degree_paper_id]]
      if (!is.null(second_degree_citing_papers)) {
        data.table(
          from = sapply(second_degree_citing_papers, function(paper) paper$paperId),
          to = first_degree_paper_id
        )
      }
    }), fill = TRUE)
    
    # Combine edges and remove NAs
    edges <- rbindlist(list(first_degree_edges, second_degree_edges), fill = TRUE)
    edges <- na.omit(edges)
    cat(sprintf("Total edges processed: %d\n", nrow(edges)))
    
    # Create the graph from the edges data frame
    if (nrow(edges) > 0) {
      citation_graph <- graph_from_data_frame(edges, directed = TRUE)
      return(citation_graph)
    } else {
      cat("No valid edges found to create a citation network.\n")
      return(NULL)
    }
  }
  first_second_network <- infer_combined_citation_network(citing_paper_details_batch, second_degree_citing_paper_details_batch)
  
  
  plot_citation_network <- function(g, author_paper_ids) {
    if (is.null(g)) {
      cat("The graph object is NULL. Cannot plot an empty graph.\n")
      return(NULL)
    }
    
    cat("Starting the plotting process...\n")
    cat(sprintf("Number of nodes: %d. Adjusting layout parameters for DrL Layout...\n", vcount(g)))
    
    # Using DrL layout with default settings, which can be adjusted based on the behavior of your specific graph
    options <- drl_defaults$default
    options$init.temperature <- sqrt(vcount(g)) * 10
    options$liquid.temperature <- sqrt(vcount(g)) * 5
    options$cooldown.temperature <- sqrt(vcount(g)) * 2.5
    
    cat("Configuring DrL layout parameters...\n")
    layout <- layout_with_drl(g, 
                              options = options)
    
    cat("Layout calculation completed. Starting to plot...\n")
    
    # Node attributes
    node_sizes <- ifelse(V(g)$name %in% author_paper_ids, 15, 0)  # Only author's papers are visible
    node_colors <- ifelse(V(g)$name %in% author_paper_ids, "gold", "transparent")  # Highlight author's papers
    
    # Edge attributes: Could use weights or other attributes for edge color
    edge_colors <- "darkgray"  # Simple gray for now, adjust as needed
    
    # Plot the graph
    plot(g, layout = layout, main = "Paper Citation Network",
         vertex.color = node_colors, vertex.size = node_sizes, vertex.frame.color = "black",
         edge.color = edge_colors, vertex.label = NA, edge.width = 1,
         margin = -0.5)  # Adjust margin to use full plotting area
    
    # Add a legend for edge colors if needed
    legend("bottomleft", legend = c("Author's paper", "Cited papers"), 
           col = c("gold", "transparent"), 
           pch = 21, 
           pt.bg = c("gold", "transparent"), 
           pt.cex = 1.5,
           bg = "white")
    
    cat("Plotting completed.\n")
  }
  plot_citation_network(first_second_network, author_paper_ids = names(citing_paper_details_batch))
  
  
  library(ggraph)
  library(igraph)
  plot_citation_network_ggraph <- function(g, author_paper_ids, layout_name = "tree") {
    if (is.null(g)) {
      cat("The graph object is NULL. Cannot plot an empty graph.\n")
      return(NULL)
    }
    
    cat("Preparing to plot the network using ", layout_name, " layout...\n")
    
    # Define node aesthetics
    node_colors <- ifelse(V(g)$name %in% author_paper_ids, "red", "blue")
    node_sizes <- ifelse(V(g)$name %in% author_paper_ids, 10, 3)
    
    # Create the plot with the chosen layout
    p <- ggraph(g, layout = layout_name) +
      geom_edge_link(aes(color = "gray"), alpha = 0.5) +
      geom_node_point(aes(color = node_colors, size = node_sizes)) +
      scale_color_manual(values = c("Author's Papers" = "red", "Cited Papers" = "blue")) +
      ggtitle("Citation Network") +
      theme_minimal() +
      theme(legend.position = "right") +
      labs(color = "Paper Type", size = "Node Size")
    
    print(p)
    cat("Plotting completed.\n")
  }
  plot_citation_network_ggraph(first_second_network, author_paper_ids = names(citing_paper_details_batch))
  
  plot_fabric_citation_network <- function(g, author_paper_ids, use_shadow_edges = TRUE) {
    if (is.null(g)) {
      cat("The graph object is NULL. Cannot plot an empty graph.\n")
      return(NULL)
    }
    
    cat("Preparing to plot the network using fabric layout...\n")
    
    # Create the fabric plot with optional shadow edges
    p <- ggraph(g, layout = 'fabric', sort.by = node_rank_fabric(), shadow.edges = use_shadow_edges) +
      geom_node_range(colour = 'grey') +
      geom_edge_span(aes(filter = shadow_edge), colour = 'lightblue', end_shape = 'square') +
      geom_edge_span(aes(filter = !shadow_edge), end_shape = 'square') +
      coord_fixed() +
      theme_minimal() +
      ggtitle("Citation Network with Fabric Layout") +
      theme(axis.text = element_blank(),
            axis.ticks = element_blank(),
            panel.grid = element_blank(),
            legend.position = "none")
    
    print(p)
    cat("Plotting completed.\n")
  }
  plot_fabric_citation_network(first_second_network, author_paper_ids = names(citing_paper_details_batch))
  
  require(tidygraph)
  plot_citation_networks_multiple_layouts <- function(g, author_paper_ids, layouts = c('stress', 'fr', 'lgl', 'graphopt')) {
    if (is.null(g)) {
      cat("The graph object is NULL. Cannot plot an empty graph.\n")
      return(NULL)
    }
    
    cat("Preparing to plot the network with multiple layouts...\n")
    
    # Convert to a tidygraph object and add a 'type' attribute to differentiate author's papers
    graph <- as_tbl_graph(g) |> 
      mutate(type = ifelse(name %in% author_paper_ids, "author", "cited"),
             degree = centrality_degree())
    
    plots <- lapply(layouts, function(layout) {
      ggraph(graph, layout = layout) + 
        geom_edge_link(aes(colour = factor(degree)), show.legend = FALSE) +
        geom_node_point(aes(color = type), size = 3) + 
        scale_color_manual(values = c("author" = "gold", "cited" = "lightblue")) + 
        labs(caption = paste0('Layout: ', layout)) +
        theme_void()
    })
    
    cat("Plotting completed.\n")
    
    return(plots)
  }
  tmp<-plot_citation_networks_multiple_layouts(first_second_network, author_paper_ids = names(citing_paper_details_batch))
  
  # Not specifying the layout - defaults to "auto"
  ggraph(first_second_network)
  
  plot_interactive_citation_network(first_second_network)
  
  
  
}


