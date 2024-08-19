#script to convert WOS citation map to JSON

#link to my citation map data, not sure if always active,
#probably need to manually log-in and regenerate occasionally
#https://www.webofscience.com/wos-researcher/dashboard/citation-map/?task_id=6462b798-ed5b-466c-9f60-47ca77c06d70

#instructions from 
#https://jokergoo.github.io/2023/02/18/generate-citation-map/

#Simply add citation = in the very beginning of citation.json (we assume the variable is called citation).

#Now we can use the V8 package to execute the JavaScript code.
library(V8)
library(jsonlite)
ct = v8()
ct$source("_data/map.txt")

#Transfer the JavaScript variable citation into R by the get() method.
citation = ct$get("citation")

#str(citation$results[, 1:4])
#str(citation$results[, 5][[2]])

#1:4 is a summary of cities and citation counts
results = citation$results[, 1:4]
head(results)

#convert to proper json
json.out<-toJSON(results)
#print(names(json.out))

write(json.out, file='_data/map_data.json')

