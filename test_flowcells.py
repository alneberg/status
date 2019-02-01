import requests
import json
import logging
URL = 'http://localhost:9761/'
API_URL = "{}api/v1/".format(URL)

def main():
    flowcells = json.loads(requests.get(API_URL + 'flowcells').content)
    for flowcell_id in flowcells:
        flowcell_url = URL + 'flowcells/' + flowcell_id
        response = requests.get(flowcell_url)
        if response.ok:
            print("OK:\t{}".format(flowcell_id))
        else:
            print("NOT OK:\t{}:{}".format(flowcell_id, flowcell_url))


main()
