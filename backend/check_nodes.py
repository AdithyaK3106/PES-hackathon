import requests

filepath = r'c:\Users\urbra\OneDrive\Desktop\Projects\PES\Bank-statements-dataset\primary\18306700003.pdf'
print("Uploading document...")
response = requests.post('http://localhost:8000/upload', files={'file': open(filepath, 'rb')})
if response.status_code != 200:
    print(f"Failed to upload: {response.text}")
    exit(1)

data = response.json()
case_id = data['case_id']

print(f"Fetching investigation details for case: {case_id}...")
graph_resp = requests.get(f'http://localhost:8000/investigation/{case_id}').json()
graph = graph_resp['graph']

print(f"Nodes count: {len(graph['nodes'])}")
print(f"Edges count: {len(graph['edges'])}")
print(f"Total transactions: {len(graph_resp['transactions'])}")
