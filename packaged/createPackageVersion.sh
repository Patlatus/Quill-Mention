sudo rm -rf force-app
echo "Deleted force-app folder"
cp -r ../unpackaged/force-app .

chmod +x ./scripts/patchNamespace.sh
./scripts/patchNamespace.sh

pid=$(sfdx force:package:version:create -f config/project-scratch-def.json -d force-app -x  -w 60 --skipvalidation --json | jq '.result.SubscriberPackageVersionId' -r)
echo "Package Version Id: $pid"
if [ -z "$pid" ]
then
   echo "Package version create failed"
   exit
fi
echo "Hi. Created a new beta package version https://login.salesforce.com/packaging/installPackage.apexp?p0=$pid

This version includes the following updates:" > messageBeta_$pid.txt
