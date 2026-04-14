# ttd

# test -1
curl -X POST \
  https://api-inference.huggingface.co/models/facebook/bart-large-cnn \
  -H "Authorization: Bearer hf_YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Iran chose not to accept US terms according to Vice President Vance after nuclear negotiations broke down over the weekend. US and Iranian forces are searching for a missing American crew member after a US warplane was shot down.", "parameters": {"max_length": 80, "min_length": 30}}'