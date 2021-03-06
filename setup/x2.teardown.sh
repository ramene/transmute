
curl -k -X DELETE \
  --url $KONG_ADMIN_URL/apis/ipfs/plugins/cea869a3-faa4-44ae-a4d7-2e81a0cb32ef | jq

curl -k -X DELETE \
  --url $KONG_ADMIN_URL/apis/ipfs | jq

curl -k -X DELETE \
  --url $KONG_ADMIN_URL/consumers/$KONG_CONSUMER_USERNAME | jq

curl -k -X DELETE \
  --url $KONG_ADMIN_URL/apis/ganache

helm delete --purge gateway 

helm delete --purge decentralized-storage

helm delete --purge ganache

rm ./setup/okta.pem

say 'helm teardown complete.'