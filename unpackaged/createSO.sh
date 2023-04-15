sfdx force:org:create -s -d 30 -a mention$(( RANDOM % 1000)) -f config/project-scratch-def.json
sfdx force:source:deploy -p force-app
sfdx force:data:record:update -s User -i $(sfdx force:user:display --json | jq '.result.id' -r)   -v "TimeZoneSidKey=Europe/Kiev"  
sfdx force:data:record:update -s User -i $(sfdx force:user:display --json | jq '.result.id' -r)   -v LanguageLocaleKey=en_US
./add.sh

sfdx force:org:open