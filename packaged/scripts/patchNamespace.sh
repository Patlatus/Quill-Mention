namespace=$(cat sfdx-project.json | jq '.namespace' -r)
find force-app -type f \( -name "*.app" -o -name "*.component"  -o -name "*.page" \) -exec sed -i "s/c:/$namespace:/g" {} \;

echo "Patched namespaces in UI (LWC, Aura, VF)"

find force-app -type f -name "*.cls" -exec sed -i "s/callout:/callout:$namespace/g" {} \;

echo "Patched namespaces in classes"

find force-app -type f -name "*.css" -exec sed -i "s|src:url('/resource/|src:url('/resource/${namespace}__|g" {} \; 

echo "Patched namespaces in LWC CSS static resource references" 