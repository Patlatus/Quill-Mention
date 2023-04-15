default=$(sfdx config:get defaultusername | awk '/^==|^──|^Name/ {next}{print $2}')

sfdx force:config:set defaultusername=$1
username=$(sfdx force:org:display --json | jq '.result.username' -r)

pn="Custom Feature Parameters Application"
previousPackageVersionName=$(sfdx force:package:installed:list --json | jq ".result [] | select(.SubscriberPackageName==\"$pn\") .SubscriberPackageVersionName" -r)
previousPackageVersionNumber=$(sfdx force:package:installed:list --json | jq ".result [] | select(.SubscriberPackageName==\"$pn\") .SubscriberPackageVersionNumber" -r)
previousPackageVersion=$(sfdx force:package:installed:list --json | jq ".result [] | select(.SubscriberPackageName==\"$pn\") .SubscriberPackageVersionId" -r)

./scripts/ui.sh "$previousPackageVersionName" "$previousPackageVersionNumber" "$previousPackageVersion" "$pn package" "$username" "${username##*.}" $1
result=$(cat result.txt)
previousResult=$(cat previousResult.txt)
echo $result
echo $previousResult

pn=$(cat sfdx-project.json | jq '.packageAliases | keys [0]' -r)
previousPackageVersionName=$(sfdx force:package:installed:list --json | jq ".result [] | select(.SubscriberPackageName==\"$pn\") .SubscriberPackageVersionName" -r)
previousPackageVersionNumber=$(sfdx force:package:installed:list --json | jq ".result [] | select(.SubscriberPackageName==\"$pn\") .SubscriberPackageVersionNumber" -r)
previousPackageVersion=$(sfdx force:package:installed:list --json | jq ".result [] | select(.SubscriberPackageName==\"$pn\") .SubscriberPackageVersionId" -r)
./scripts/ui.sh "$previousPackageVersionName" "$previousPackageVersionNumber" "$previousPackageVersion" "$pn package" "$username" "${username##*.}" "$1"
result=$(cat result.txt)
previousResult=$(cat previousResult.txt)
echo $result
echo $previousResult

# restore default org setting
sfdx config:set defaultusername=$default