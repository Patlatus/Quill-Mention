namespace=$(cat sfdx-project.json | jq '.namespace' -r)
echo "Going inside packaged folder"
rm -rf examples
echo "Deleted examples folder"
cp -r ../unpackaged/examples .

find examples -type f \( -name "*.app" -o -name "*.component"  -o -name "*.page" \) -exec sed -i "s/c:/$namespace:/g" {} \;

echo "Patched namespaces in UI (LWC, Aura, VF)"

find examples -type f -name "*.cls" -exec sed -i "s/callout:/callout:$namespace/g" {} \;

echo "Patched namespaces in classes"

find examples -type f -name "*.css" -exec sed -i "s|src:url('/resource/|src:url('/resource/${namespace}__|g" {} \; 

echo "Patched namespaces in LWC CSS static resource references" 

find examples -type f -name "*.html" -exec sed -i "s/c-/$namespace-/g" {} \;